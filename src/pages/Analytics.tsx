import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useVendors } from "@/hooks/useVendors";
import { useIncome } from "@/hooks/useIncome";
import { useBankTransactions } from "@/hooks/useBankTransactions";
import { useTransactions } from "@/hooks/useTransactions";
import { supabase } from "@/integrations/supabase/client";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard as CreditCardIcon,
  Calendar as CalendarIcon,
  PieChart as PieChartIcon,
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
import { useMemo, useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Analytics() {
  const navigate = useNavigate();
  const { vendors } = useVendors();
  const { incomeItems } = useIncome();
  const { transactions: bankTransactions } = useBankTransactions();
  const { transactions: dbTransactions } = useTransactions();
  // Fetch ALL vendor transactions (including archived/completed, excluding deleted)
  const [vendorTransactions, setVendorTransactions] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchAllVendorTransactions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          vendors(name, category)
        `)
        .eq('type', 'purchase_order')
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching vendor transactions:', error);
        return;
      }

      const parseDateFromDB = (dateString: string) => {
        const [y, m, d] = dateString.split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
      };

      const formatted = data?.map(tx => ({
        id: tx.id,
        vendorId: tx.vendor_id,
        vendorName: tx.vendors?.name || 'Unknown',
        amount: Number(tx.amount),
        dueDate: tx.due_date ? parseDateFromDB(tx.due_date) : new Date(),
        transactionDate: tx.transaction_date ? parseDateFromDB(tx.transaction_date) : new Date(),
        status: tx.status,
        description: tx.description || '',
        category: tx.vendors?.category || '',
        type: tx.type,
        archived: tx.archived || false
      })) || [];

      setVendorTransactions(formatted);
    };

    fetchAllVendorTransactions();
    
    // Set up real-time subscription for vendor transactions
    const channel = supabase
      .channel('vendor-transactions-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: 'type=eq.purchase_order'
        },
        () => {
          fetchAllVendorTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const { creditCards } = useCreditCards();
  const { amazonPayouts } = useAmazonPayouts();
  const { accounts } = useBankAccounts();
  const { recurringExpenses } = useRecurringExpenses();
  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 9, 1);
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);
  
  const [vendorDateRange, setVendorDateRange] = useState<string>("this-month");
  const [incomeDateRange, setIncomeDateRange] = useState<string>("this-month");
  const [customStartDate, setCustomStartDate] = useState<Date>(defaultStartDate);
  const [customEndDate, setCustomEndDate] = useState<Date>(defaultEndDate);

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

  // Revenue over time (last 6 months) - includes Amazon payouts and recurring income
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

    // Aggregate income from last 6 months - filter by payment date
    incomeItems.forEach(item => {
      const paymentDate = new Date(item.paymentDate);
      if (paymentDate >= sixMonthsAgo) {
        const key = paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyData.hasOwnProperty(key)) {
          monthlyData[key] += item.amount;
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

  // Helper to get date range
  const getDateRange = (rangeType: string) => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    
    switch (rangeType) {
      case "custom":
        return { 
          start: new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate(), 0, 0, 0, 0),
          end: new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate(), 23, 59, 59, 999)
        };
      case "this-month":
        return { start: startOfThisMonth, end: endOfThisMonth };
      case "last-month":
        return { 
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1), 
          end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) 
        };
      case "last-2-months":
        return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: endOfThisMonth };
      case "last-3-months":
        return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end: endOfThisMonth };
      case "last-6-months":
        return { start: new Date(now.getFullYear(), now.getMonth() - 6, 1), end: endOfThisMonth };
      case "ytd":
        return { start: startOfYear, end: endOfThisMonth };
      default:
        return { 
          start: new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate(), 0, 0, 0, 0),
          end: new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate(), 23, 59, 59, 999)
        };
    }
  };

  // Income breakdown by source (filtered by date range)
  const incomeBySource = useMemo(() => {
    const { start, end } = getDateRange(incomeDateRange);
    const sourceData: Record<string, number> = {
      'Customer Payments': 0,
      'Sales Orders': 0,
      'Recurring Income': 0,
      'Amazon Payouts': 0,
      'Other Income': 0
    };

    // Income items filtered by payment date
    incomeItems.forEach(item => {
      const paymentDate = new Date(item.paymentDate);
      if (paymentDate >= start && paymentDate <= end) {
        if (item.isRecurring) {
          sourceData['Recurring Income'] += item.amount;
        } else if (item.source === 'Amazon') {
          sourceData['Amazon Payouts'] += item.amount;
        } else if (item.category) {
          sourceData[item.category] = (sourceData[item.category] || 0) + item.amount;
        } else {
          sourceData['Other Income'] += item.amount;
        }
      }
    });

    // Amazon payouts filtered by payout date
    amazonPayouts.forEach(payout => {
      const payoutDate = new Date(payout.payout_date);
      if (payoutDate >= start && payoutDate <= end) {
        sourceData['Amazon Payouts'] += payout.total_amount || 0;
      }
    });

    // Completed sales orders and customer payments filtered by transaction date
    dbTransactions.forEach(tx => {
      const txDate = new Date(tx.transactionDate);
      if (txDate >= start && txDate <= end) {
        if (tx.type === 'customer_payment' && tx.status === 'completed') {
          sourceData['Customer Payments'] += tx.amount;
        } else if (tx.type === 'sales_order' && tx.status === 'completed') {
          sourceData['Sales Orders'] += tx.amount;
        }
      }
    });

    return Object.entries(sourceData)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [incomeItems, amazonPayouts, dbTransactions, incomeDateRange, customStartDate, customEndDate]);

  // Purchase Orders breakdown by vendor category (inventory, goods)
  const purchaseOrderCategoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const { start, end } = getDateRange(vendorDateRange);
    
    console.log('📊 Purchase Order Analytics Debug:', {
      dateRange: vendorDateRange,
      start: start.toISOString(),
      end: end.toISOString(),
      totalVendorTransactions: vendorTransactions.length,
    });
    
    // Add amounts from vendor transactions (purchase orders) - ONLY include if due date is in the selected range
    vendorTransactions.forEach(tx => {
      const dueDate = new Date(tx.dueDate);
      const isInRange = dueDate >= start && dueDate <= end;
      
      if (isInRange && tx.status !== 'cancelled') {
        const category = tx.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + tx.amount;
      }
    });

    console.log('📊 Purchase Order Category totals:', categoryTotals);

    return Object.entries(categoryTotals)
      .map(([category, total]) => ({
        name: category,
        value: total
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [vendorTransactions, vendorDateRange, customStartDate, customEndDate]);

  // Recurring Expenses breakdown by category (employee costs, software, etc.)
  const recurringExpenseCategoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const { start, end } = getDateRange(vendorDateRange);
    
    console.log('📊 Recurring Expense Analytics Debug:', {
      dateRange: vendorDateRange,
      start: start.toISOString(),
      end: end.toISOString(),
      totalRecurringExpenses: recurringExpenses.length,
    });
    
    // Add amounts from recurring expenses within the date range
    recurringExpenses.forEach(expense => {
      if (!expense.is_active) return;
      
      const expenseStart = new Date(expense.start_date);
      const expenseEnd = expense.end_date ? new Date(expense.end_date) : null;
      
      // Check if the recurring expense is active during the selected date range
      const isActive = expenseStart <= end && (!expenseEnd || expenseEnd >= start);
      
      if (isActive) {
        const category = expense.category || 'Uncategorized';
        // Calculate the total for the date range based on frequency
        // For simplicity, we'll just add the monthly amount
        categoryTotals[category] = (categoryTotals[category] || 0) + (expense.amount || 0);
      }
    });

    console.log('📊 Recurring Expense Category totals:', categoryTotals);

    return Object.entries(categoryTotals)
      .map(([category, total]) => ({
        name: category,
        value: total
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [recurringExpenses, vendorDateRange, customStartDate, customEndDate]);

  // Combined expense data (purchase orders + recurring expenses)
  const vendorCategoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    // Merge purchase order data
    purchaseOrderCategoryData.forEach(item => {
      categoryTotals[item.name] = (categoryTotals[item.name] || 0) + item.value;
    });
    
    // Merge recurring expense data
    recurringExpenseCategoryData.forEach(item => {
      categoryTotals[item.name] = (categoryTotals[item.name] || 0) + item.value;
    });

    return Object.entries(categoryTotals)
      .map(([category, total]) => ({
        name: category,
        value: total
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [purchaseOrderCategoryData, recurringExpenseCategoryData]);

  // Top vendors by spending
  const topVendors = useMemo(() => {
    const vendorTotals: Record<string, number> = {};
    const { start, end } = getDateRange(vendorDateRange);
    
    // Initialize all vendors with 0
    vendors.forEach(vendor => {
      vendorTotals[vendor.name] = 0;
    });
    
    // Add amounts from vendor transactions - ONLY if due date is in range
    vendorTransactions.forEach(tx => {
      const dueDate = new Date(tx.dueDate);
      
      if (dueDate >= start && dueDate <= end && tx.status !== 'cancelled') {
        const vendorName = tx.vendorName || 'Unknown Vendor';
        vendorTotals[vendorName] = (vendorTotals[vendorName] || 0) + tx.amount;
      }
    });
    
    console.log('📊 Vendor totals:', vendorTotals);
    console.log('📊 All vendors:', vendors.map(v => v.name));
    console.log('📊 Transactions in range:', vendorTransactions.filter(tx => {
      const txDate = new Date(tx.dueDate || tx.transactionDate);
      return txDate >= start && txDate <= end;
    }));
    
    return Object.entries(vendorTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [vendors, vendorTransactions, vendorDateRange, customStartDate, customEndDate]);

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
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle>Income Breakdown by Source</CardTitle>
                  <div className="flex gap-2 items-center">
                    <Select value={incomeDateRange} onValueChange={setIncomeDateRange}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background">
                        <SelectItem value="custom">Custom Range</SelectItem>
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="last-2-months">Last 2 Months</SelectItem>
                        <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                        <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                        <SelectItem value="ytd">Year to Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={incomeBySource}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {incomeBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">Total Income by Source</h4>
                  {incomeBySource.map((source, index) => (
                    <div key={source.name} className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{source.name}</span>
                      </div>
                      <span className="text-sm font-semibold">${source.value.toLocaleString()}</span>
                    </div>
                  ))}
                  {incomeBySource.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No income in this period</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle>Expense Breakdown by Category</CardTitle>
                  <Select value={vendorDateRange} onValueChange={setVendorDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      <SelectItem value="custom">Custom Range</SelectItem>
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
                
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">Total Spending by Category</h4>
                  {vendorCategoryData.map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      <span className="text-sm font-semibold">${category.value.toLocaleString()}</span>
                    </div>
                  ))}
                  {vendorCategoryData.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No expenses in this period</p>
                  )}
                </div>
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
                <CalendarIcon className="h-4 w-4 text-amber-600" />
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
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Purchase Orders by Category
                  </CardTitle>
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
                <p className="text-sm text-muted-foreground mt-2">Inventory & goods purchases</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={purchaseOrderCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {purchaseOrderCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                {purchaseOrderCategoryData.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No purchase orders in this period</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    Recurring Expenses by Category
                  </CardTitle>
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
                <p className="text-sm text-muted-foreground mt-2">Employee costs, software, etc.</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={recurringExpenseCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {recurringExpenseCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                {recurringExpenseCategoryData.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recurring expenses in this period</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">

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
                <CardTitle className="text-sm font-medium">Monthly Amazon Projected Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${(() => {
                    // Calculate average Amazon payout from recent payouts
                    const recentPayouts = amazonPayouts.slice(0, 6); // Last 6 payouts
                    const avgPayout = recentPayouts.length > 0 
                      ? recentPayouts.reduce((sum, p) => sum + (p.total_amount || 0), 0) / recentPayouts.length 
                      : 0;
                    // Estimate monthly (assuming bi-weekly = 2 payouts per month)
                    return (avgPayout * 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on recent payouts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Recurring (Monthly)</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Income:</span>
                    <span className="text-sm font-semibold text-green-600">
                      +${recurringExpenses
                        .filter(r => r.type === 'income' && r.is_active && r.frequency === 'monthly')
                        .reduce((sum, r) => sum + r.amount, 0)
                        .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Expenses:</span>
                    <span className="text-sm font-semibold text-red-600">
                      -${recurringExpenses
                        .filter(r => r.type === 'expense' && r.is_active && r.frequency === 'monthly')
                        .reduce((sum, r) => sum + r.amount, 0)
                        .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Purchase Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  ${dbTransactions
                    .filter(tx => tx.type === 'purchase_order' && tx.status === 'pending')
                    .reduce((sum, tx) => sum + tx.amount, 0)
                    .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dbTransactions.filter(tx => tx.type === 'purchase_order' && tx.status === 'pending').length} pending orders
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
                <CalendarIcon className="h-4 w-4 text-amber-600" />
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
