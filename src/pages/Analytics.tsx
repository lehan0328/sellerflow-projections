import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useVendors } from "@/hooks/useVendors";
import { useIncome } from "@/hooks/useIncome";
import { useBankTransactions } from "@/hooks/useBankTransactions";
import { useTransactions } from "@/hooks/useTransactions";
import { useVendorTransactions } from "@/hooks/useVendorTransactions";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useBankAccounts } from "@/hooks/useBankAccounts";
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
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Analytics() {
  const navigate = useNavigate();
  const { vendors } = useVendors();
  const { incomeItems } = useIncome();
  const { transactions: bankTransactions } = useBankTransactions();
  const { transactions: dbTransactions } = useTransactions();
  const { transactions: vendorTransactions } = useVendorTransactions();
  const { creditCards } = useCreditCards();
  const { amazonPayouts } = useAmazonPayouts();
  const { accounts } = useBankAccounts();
  const [vendorDateRange, setVendorDateRange] = useState<string>("this-month");

  // Calculate key metrics
  const metrics = useMemo(() => {
    // Total cash inflow from bank transactions (credits)
    const bankInflow = bankTransactions
      .filter(tx => tx.transactionType === 'credit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Total inflow from sales orders and customer payments
    const transactionInflow = dbTransactions
      .filter(tx => (tx.type === 'sales_order' || tx.type === 'customer_payment') && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Total inflow from income items (received)
    const incomeInflow = incomeItems
      .filter(i => i.status === 'received')
      .reduce((sum, i) => sum + i.amount, 0);

    const totalInflow = bankInflow + transactionInflow + incomeInflow;

    // Total cash outflow from bank transactions (debits)
    const bankOutflow = bankTransactions
      .filter(tx => tx.transactionType === 'debit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Total outflow from purchase orders and vendor payments
    const transactionOutflow = dbTransactions
      .filter(tx => (tx.type === 'purchase_order' || tx.type === 'vendor_payment') && tx.status !== 'cancelled')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalOutflow = bankOutflow + transactionOutflow;

    // Current bank balance
    const currentBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

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

    // Total expenses from vendors + purchase orders
    const vendorExpenses = vendors.reduce((sum, v) => sum + (v.totalOwed || 0), 0);
    const purchaseOrders = dbTransactions
      .filter(tx => tx.type === 'purchase_order' && tx.status === 'pending')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = vendorExpenses + purchaseOrders;

    // Net cash flow
    const netCashFlow = totalInflow - totalOutflow;

    return {
      totalInflow,
      totalOutflow,
      currentBalance,
      pendingIncome,
      creditUtilization,
      amazonRevenue,
      totalExpenses,
      netCashFlow
    };
  }, [bankTransactions, dbTransactions, incomeItems, vendors, creditCards, amazonPayouts, accounts]);

  // Revenue over time (last 6 months) - includes Amazon payouts
  const revenueData = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[key] = 0;
    }

    // Aggregate received income from last 6 months
    incomeItems.forEach(item => {
      if (item.status === 'received') {
        const date = new Date(item.paymentDate);
        if (date >= sixMonthsAgo) {
          const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          if (monthlyData.hasOwnProperty(key)) {
            monthlyData[key] += item.amount;
          }
        }
      }
    });

    // Aggregate Amazon payouts from last 6 months
    amazonPayouts.forEach(payout => {
      const date = new Date(payout.payout_date);
      if (date >= sixMonthsAgo) {
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyData.hasOwnProperty(key)) {
          monthlyData[key] += payout.total_amount || 0;
        }
      }
    });

    // Aggregate completed sales orders from last 6 months
    dbTransactions.forEach(tx => {
      if ((tx.type === 'sales_order' || tx.type === 'customer_payment') && tx.status === 'completed') {
        const date = new Date(tx.transactionDate);
        if (date >= sixMonthsAgo) {
          const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          if (monthlyData.hasOwnProperty(key)) {
            monthlyData[key] += tx.amount;
          }
        }
      }
    });

    return Object.entries(monthlyData).map(([month, revenue]) => ({
      month,
      revenue
    }));
  }, [incomeItems, amazonPayouts, dbTransactions]);

  // Expense breakdown by vendor category
  // Helper to get date range
  const getDateRange = (rangeType: string) => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    switch (rangeType) {
      case "this-month":
        return { start: startOfThisMonth, end: now };
      case "last-month":
        return { 
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1), 
          end: new Date(now.getFullYear(), now.getMonth(), 0) 
        };
      case "last-2-months":
        return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now };
      case "last-3-months":
        return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end: now };
      case "last-6-months":
        return { start: new Date(now.getFullYear(), now.getMonth() - 6, 1), end: now };
      case "ytd":
        return { start: startOfYear, end: now };
      default:
        return { start: startOfThisMonth, end: now };
    }
  };

  const vendorCategoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const { start, end } = getDateRange(vendorDateRange);
    
    // Add amounts from vendors table (only if they fall in range)
    vendors.forEach(vendor => {
      const paymentDate = vendor.nextPaymentDate;
      if (paymentDate >= start && paymentDate <= end) {
        const category = vendor.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + vendor.totalOwed;
      }
    });
    
    // Add amounts from vendor transactions (both pending and completed, exclude deleted)
    vendorTransactions
      .filter(tx => {
        const txDate = tx.dueDate || tx.transactionDate;
        return txDate >= start && txDate <= end;
      })
      .forEach(tx => {
        const category = tx.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + tx.amount;
      });

    return Object.entries(categoryTotals)
      .map(([category, total]) => ({
        name: category,
        value: total
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [vendors, vendorTransactions, vendorDateRange]);

  // Top vendors by spending
  const topVendors = useMemo(() => {
    const vendorTotals: Record<string, number> = {};
    const { start, end } = getDateRange(vendorDateRange);
    
    // Add amounts from vendor transactions (both pending and completed, exclude deleted)
    vendorTransactions
      .forEach(tx => {
        const txDate = new Date(tx.dueDate || tx.transactionDate);
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        if (txDate >= startDate && txDate <= endDate) {
          const vendorName = tx.vendorName || 'Unknown Vendor';
          vendorTotals[vendorName] = (vendorTotals[vendorName] || 0) + tx.amount;
        }
      });
    
    return Object.entries(vendorTotals)
      .map(([name, amount]) => ({ name, amount }))
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [vendorTransactions, vendorDateRange]);

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

    // Aggregate income from received income items
    incomeItems.forEach(item => {
      if (item.status === 'received') {
        const date = new Date(item.paymentDate);
        const key = date.toLocaleDateString('en-US', { month: 'short' });
        if (monthlyData[key]) {
          monthlyData[key].income += item.amount;
        }
      }
    });

    // Aggregate income from completed sales orders
    dbTransactions.forEach(tx => {
      if ((tx.type === 'sales_order' || tx.type === 'customer_payment') && tx.status === 'completed') {
        const date = new Date(tx.transactionDate);
        const key = date.toLocaleDateString('en-US', { month: 'short' });
        if (monthlyData[key]) {
          monthlyData[key].income += tx.amount;
        }
      }
    });

    // Aggregate expenses from bank transactions (debit)
    bankTransactions.forEach(tx => {
      if (tx.transactionType === 'debit') {
        const date = new Date(tx.date);
        const key = date.toLocaleDateString('en-US', { month: 'short' });
        if (monthlyData[key]) {
          monthlyData[key].expenses += tx.amount;
        }
      }
    });

    // Aggregate expenses from purchase orders and vendor payments
    dbTransactions.forEach(tx => {
      if ((tx.type === 'purchase_order' || tx.type === 'vendor_payment') && tx.status !== 'cancelled') {
        const date = new Date(tx.transactionDate);
        const key = date.toLocaleDateString('en-US', { month: 'short' });
        if (monthlyData[key]) {
          monthlyData[key].expenses += tx.amount;
        }
      }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses
    }));
  }, [incomeItems, bankTransactions, dbTransactions]);

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
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.currentBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total across all accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inflow</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${metrics.totalInflow.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Money received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outflow</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${metrics.totalOutflow.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Money spent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.netCashFlow >= 0 ? '+' : ''}${metrics.netCashFlow.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Inflow - Outflow
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
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
                <div className="flex items-center justify-between">
                  <CardTitle>Expense Breakdown by Category</CardTitle>
                  <Select value={vendorDateRange} onValueChange={setVendorDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="last-month">Last Month</SelectItem>
                      <SelectItem value="last-2-months">Last 2 Months</SelectItem>
                      <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                      <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                      <SelectItem value="ytd">Year to Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <div className="flex items-center justify-between">
                <CardTitle>Top 10 Vendors by Spending</CardTitle>
                <Select value={vendorDateRange} onValueChange={setVendorDateRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="last-2-months">Last 2 Months</SelectItem>
                    <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                    <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                    <SelectItem value="ytd">Year to Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <CardTitle className="text-sm font-medium">Pending Obligations</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${metrics.totalExpenses.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Owed to vendors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Credit</CardTitle>
                <CreditCardIcon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${creditCards.reduce((sum, c) => sum + (c.available_credit || 0), 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.creditUtilization.toFixed(1)}% utilized
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

        <TabsContent value="expenses" className="space-y-4">
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
      </Tabs>
    </div>
  );
}
