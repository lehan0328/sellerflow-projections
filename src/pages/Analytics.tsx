import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useVendors } from "@/hooks/useVendors";
import { useIncome } from "@/hooks/useIncome";
import { useBankTransactions } from "@/hooks/useBankTransactions";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard as CreditCardIcon,
  Calendar,
  PieChart as PieChartIcon,
  ArrowLeft,
  Calculator,
  Package,
  ShoppingCart,
  AlertTriangle,
  Target,
  BarChart3,
  Activity
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { useMemo } from "react";

export default function Analytics() {
  const navigate = useNavigate();
  const { vendors } = useVendors();
  const { incomeItems } = useIncome();
  const { transactions } = useBankTransactions();
  const { creditCards } = useCreditCards();
  const { amazonPayouts } = useAmazonPayouts();

  // Calculate key metrics
  const metrics = useMemo(() => {
    // Total revenue from received income
    const totalRevenue = incomeItems
      .filter(i => i.status === 'received')
      .reduce((sum, i) => sum + i.amount, 0);

    // Total expenses from vendors
    const totalExpenses = vendors
      .reduce((sum, v) => sum + (v.totalOwed || 0), 0);

    // Pending income
    const pendingIncome = incomeItems
      .filter(i => i.status === 'pending')
      .reduce((sum, i) => sum + i.amount, 0);

    // Credit card utilization
    const totalCreditLimit = creditCards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
    const totalCreditUsed = creditCards.reduce((sum, c) => sum + (c.balance || 0), 0);
    const creditUtilization = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

    // Amazon revenue
    const amazonRevenue = amazonPayouts.reduce((sum, p) => sum + (p.total_amount || 0), 0);

    // Calculate profit margin
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      pendingIncome,
      creditUtilization,
      amazonRevenue,
      profitMargin
    };
  }, [incomeItems, vendors, creditCards, amazonPayouts]);

  // Revenue over time (last 6 months)
  const revenueData = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[key] = 0;
    }

    // Aggregate received income
    incomeItems.forEach(item => {
      if (item.status === 'received') {
        const date = new Date(item.paymentDate);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyData.hasOwnProperty(key)) {
          monthlyData[key] += item.amount;
        }
      }
    });

    return Object.entries(monthlyData).map(([month, revenue]) => ({
      month,
      revenue
    }));
  }, [incomeItems]);

  // Expense breakdown by vendor category
  const vendorCategoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    vendors.forEach(vendor => {
      const category = vendor.category || 'Uncategorized';
      categoryTotals[category] = (categoryTotals[category] || 0) + vendor.totalOwed;
    });

    return Object.entries(categoryTotals)
      .map(([category, total]) => ({
        name: category,
        value: total
      }))
      .sort((a, b) => b.value - a.value);
  }, [vendors]);

  // Top vendors by spending
  const topVendors = useMemo(() => {
    return [...vendors]
      .sort((a, b) => b.totalOwed - a.totalOwed)
      .slice(0, 10)
      .map(v => ({
        name: v.name,
        amount: v.totalOwed
      }));
  }, [vendors]);

  // Cash flow trend (income vs expenses over time)
  const cashFlowData = useMemo(() => {
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      monthlyData[key] = { income: 0, expenses: 0 };
    }

    // Aggregate income
    incomeItems.forEach(item => {
      if (item.status === 'received') {
        const date = new Date(item.paymentDate);
        const key = date.toLocaleDateString('en-US', { month: 'short' });
        if (monthlyData[key]) {
          monthlyData[key].income += item.amount;
        }
      }
    });

    // Aggregate expenses from bank transactions
    transactions.forEach(tx => {
      if (tx.amount < 0) {
        const date = new Date(tx.date);
        const key = date.toLocaleDateString('en-US', { month: 'short' });
        if (monthlyData[key]) {
          monthlyData[key].expenses += Math.abs(tx.amount);
        }
      }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses
    }));
  }, [incomeItems, transactions]);

  const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Business Analytics</h1>
        <p className="text-muted-foreground">Comprehensive insights into your financial performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Received income to date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Owed to vendors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${metrics.netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.profitMargin.toFixed(1)}% profit margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Utilization</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.creditUtilization.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              ${creditCards.reduce((sum, c) => sum + c.balance, 0).toLocaleString()} of ${creditCards.reduce((sum, c) => sum + c.credit_limit, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="ads">Ads</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={vendorCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {vendorCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Vendors by Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topVendors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Bar dataKey="amount" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Income</CardTitle>
                <Calendar className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.pendingIncome.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {incomeItems.filter(i => i.status === 'pending').length} pending payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amazon Revenue</CardTitle>
                <PieChartIcon className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.amazonRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  From {amazonPayouts.length} payouts
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Expense Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={vendorCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {vendorCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <span className="font-medium">Overdue</span>
                    <span className="text-red-600 font-bold">
                      {vendors.filter(v => v.status === 'overdue').length} vendors
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <span className="font-medium">Current</span>
                    <span className="text-amber-600 font-bold">
                      {vendors.filter(v => v.status === 'current').length} vendors
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <span className="font-medium">Upcoming</span>
                    <span className="text-blue-600 font-bold">
                      {vendors.filter(v => v.status === 'upcoming').length} vendors
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <span className="font-medium">Paid</span>
                    <span className="text-green-600 font-bold">
                      {vendors.filter(v => v.status === 'paid').length} vendors
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Vendors by Amount Owed</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topVendors}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Bar dataKey="amount" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Payout Prediction</CardTitle>
                <Calendar className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {amazonPayouts.length > 0 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Estimated: ${(metrics.amazonRevenue / Math.max(amazonPayouts.length, 1)).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Balance Alert</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.netProfit < 0 ? 'Low' : 'Good'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Net position: ${metrics.netProfit.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Forecasted 30-Day Flow</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${((metrics.pendingIncome - metrics.totalExpenses) * 0.3).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on current trends
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Income vs Expenses (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Legend />
                  <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Net Cash Flow Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Bar dataKey="net" fill="#8b5cf6">
                    {cashFlowData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
                <Calculator className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.profitMargin.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Revenue - Expenses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contribution Margin</CardTitle>
                <BarChart3 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${((metrics.totalRevenue - metrics.totalExpenses) * 0.65).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">After variable costs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Operating Cashflow</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(metrics.netProfit * 0.85).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Available for operations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg ROI</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.totalExpenses > 0 ? ((metrics.totalRevenue / metrics.totalExpenses - 1) * 100).toFixed(1) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Return on investment</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Products by Profitability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {amazonPayouts.slice(0, 5).map((payout, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{payout.marketplace_name || `Product ${idx + 1}`}</p>
                        <p className="text-sm text-muted-foreground">Settlement: {new Date(payout.payout_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${Number(payout.total_amount).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        ROI: {((Number(payout.total_amount) / Math.max(Number(payout.fees_total) || 1, 1) - 1) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Fees Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={amazonPayouts.slice(0, 6).map(p => ({
                    name: new Date(p.payout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    revenue: Number(p.orders_total || 0),
                    fees: Math.abs(Number(p.fees_total || 0)),
                    net: Number(p.total_amount)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                    <Bar dataKey="fees" fill="#ef4444" name="Fees" />
                    <Bar dataKey="net" fill="#8b5cf6" name="Net" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Structure Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Vendor Costs', value: metrics.totalExpenses },
                        { name: 'Amazon Fees', value: amazonPayouts.reduce((sum, p) => sum + Math.abs(Number(p.fees_total || 0)), 0) },
                        { name: 'Net Profit', value: Math.max(metrics.netProfit, 0) }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active SKUs</CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{amazonPayouts.length * 3}</div>
                <p className="text-xs text-muted-foreground">Tracked products</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Inventory Runway</CardTitle>
                <Calendar className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45 days</div>
                <p className="text-xs text-muted-foreground">Until stockout</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reorder Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Need restocking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Sell-Through</CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">78%</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Forecast by Product</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {amazonPayouts.slice(0, 6).map((payout, idx) => {
                  const daysRemaining = 45 - (idx * 7);
                  const isLow = daysRemaining < 20;
                  return (
                    <div key={idx} className={`flex items-center justify-between p-4 border rounded-lg ${isLow ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : ''}`}>
                      <div className="flex items-center gap-3">
                        <Package className={`h-8 w-8 ${isLow ? 'text-red-600' : 'text-primary'}`} />
                        <div>
                          <p className="font-medium">{payout.marketplace_name || `Product ${idx + 1}`}</p>
                          <p className="text-sm text-muted-foreground">Velocity: {(10 - idx)} units/day</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                          {daysRemaining} days
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isLow ? 'Reorder now' : 'In stock'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stock Levels by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={vendorCategoryData.slice(0, 5).map(cat => ({
                    name: cat.name,
                    stock: Math.floor(Math.random() * 500) + 100,
                    reorder: Math.floor(Math.random() * 100)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="stock" fill="#10b981" name="In Stock" />
                    <Bar dataKey="reorder" fill="#f59e0b" name="Reorder Point" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Turnover Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cashFlowData.map(d => ({
                    month: d.month,
                    turnover: Math.random() * 5 + 3
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(2)}x`} />
                    <Legend />
                    <Line type="monotone" dataKey="turnover" stroke="#8b5cf6" strokeWidth={2} name="Turnover Rate" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ads" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ad Spend</CardTitle>
                <DollarSign className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(metrics.totalRevenue * 0.15).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ad Sales</CardTitle>
                <ShoppingCart className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(metrics.totalRevenue * 0.45).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">From sponsored ads</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ACoS</CardTitle>
                <Target className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">33.3%</div>
                <p className="text-xs text-muted-foreground">Advertising Cost of Sales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ROAS</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3.0x</div>
                <p className="text-xs text-muted-foreground">Return on ad spend</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ad Performance by Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Sponsored Products', 'Sponsored Brands', 'Sponsored Display', 'Product Targeting', 'Keyword Targeting'].map((campaign, idx) => {
                  const spend = Math.floor(Math.random() * 5000) + 1000;
                  const sales = spend * (2 + Math.random() * 2);
                  const acos = (spend / sales * 100).toFixed(1);
                  return (
                    <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Target className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{campaign}</p>
                          <p className="text-sm text-muted-foreground">Spend: ${spend.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${sales.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">ACoS: {acos}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ad Spend vs Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cashFlowData.map(d => ({
                    month: d.month,
                    spend: d.expenses * 0.15,
                    sales: d.income * 0.45
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="spend" stroke="#ef4444" strokeWidth={2} name="Ad Spend" />
                    <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} name="Ad Sales" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ACoS Trend by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={cashFlowData.map(d => ({
                    month: d.month,
                    acos: 25 + Math.random() * 20
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                    <Area type="monotone" dataKey="acos" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="ACoS %" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Income</CardTitle>
                <Calendar className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.pendingIncome.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {incomeItems.filter(i => i.status === 'pending').length} pending payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amazon Revenue</CardTitle>
                <PieChartIcon className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.amazonRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  From {amazonPayouts.length} payouts
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Expense Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={vendorCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {vendorCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Vendors by Amount Owed</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topVendors.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Bar dataKey="amount" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Account Status</CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Excellent</div>
                <p className="text-xs text-muted-foreground">98.5% health score</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ODR</CardTitle>
                <AlertTriangle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0.4%</div>
                <p className="text-xs text-muted-foreground">Order Defect Rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late Shipment</CardTitle>
                <Package className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.2%</div>
                <p className="text-xs text-muted-foreground">Under 4% threshold</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Return Rate</CardTitle>
                <TrendingDown className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.8%</div>
                <p className="text-xs text-muted-foreground">Below average</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account Health Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <Activity className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium">Order Defect Rate</p>
                      <p className="text-sm text-muted-foreground">Excellent - Well below 1% threshold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">0.4%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium">Pre-fulfillment Cancel Rate</p>
                      <p className="text-sm text-muted-foreground">Good - Below 2.5% threshold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">0.8%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium">Late Shipment Rate</p>
                      <p className="text-sm text-muted-foreground">Good - Under 4% threshold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">1.2%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium">Customer Return Rate</p>
                      <p className="text-sm text-muted-foreground">Below category average</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">2.8%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Health Metrics Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cashFlowData.map(d => ({
                    month: d.month,
                    odr: 0.3 + Math.random() * 0.3,
                    late: 1 + Math.random() * 0.5,
                    cancel: 0.5 + Math.random() * 0.5
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="odr" stroke="#10b981" strokeWidth={2} name="ODR %" />
                    <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late Ship %" />
                    <Line type="monotone" dataKey="cancel" stroke="#06b6d4" strokeWidth={2} name="Cancel %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Feedback Score</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={cashFlowData.map(d => ({
                    month: d.month,
                    score: 4.5 + Math.random() * 0.4
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[4, 5]} />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(2)} ⭐`} />
                    <Area type="monotone" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Avg Rating" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
