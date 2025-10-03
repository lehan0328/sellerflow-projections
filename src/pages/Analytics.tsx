import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  PieChart as PieChartIcon
} from "lucide-react";
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
  const { vendors } = useVendors();
  const { incomeItems } = useIncome();
  const { transactions } = useBankTransactions();
  const { creditCards } = useCreditCards();
  const { amazonPayouts } = useAmazonPayouts();

  // Calculate key metrics
  const metrics = useMemo(() => {
    // Total revenue
    const totalRevenue = incomeItems
      .filter(i => i.status === 'received')
      .reduce((sum, i) => sum + i.amount, 0);

    // Total expenses
    const totalExpenses = vendors
      .reduce((sum, v) => sum + v.totalOwed, 0);

    // Pending income
    const pendingIncome = incomeItems
      .filter(i => i.status === 'pending')
      .reduce((sum, i) => sum + i.amount, 0);

    // Credit card utilization
    const totalCreditLimit = creditCards.reduce((sum, c) => sum + c.credit_limit, 0);
    const totalCreditUsed = creditCards.reduce((sum, c) => sum + c.balance, 0);
    const creditUtilization = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

    // Amazon revenue
    const amazonRevenue = amazonPayouts.reduce((sum, p) => sum + p.total_amount, 0);

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      pendingIncome,
      creditUtilization,
      amazonRevenue,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into your financial performance</p>
        </div>
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
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="expenses">Expense Analysis</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
