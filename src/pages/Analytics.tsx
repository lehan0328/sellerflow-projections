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
import { useAmazonRevenue } from "@/hooks/useAmazonRevenue";
import { generateRecurringDates } from "@/lib/recurringDates";
import { TrendingUp, TrendingDown, DollarSign, CreditCard as CreditCardIcon, Calendar as CalendarIcon, PieChart as PieChartIcon, Calculator, Package, ShoppingCart, AlertTriangle, Target, BarChart3, Hash, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useMemo, useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
export default function Analytics() {
  const navigate = useNavigate();
  const {
    vendors
  } = useVendors();
  const {
    incomeItems
  } = useIncome();
  const {
    transactions: bankTransactions
  } = useBankTransactions();
  const {
    transactions: dbTransactions
  } = useTransactions();
  // Fetch ALL vendor transactions (including archived/completed, excluding deleted)
  const [vendorTransactions, setVendorTransactions] = useState<any[]>([]);

  // Use unified Amazon revenue hook
  const {
    last30DaysGrossRevenue: amazonRevenue
  } = useAmazonRevenue();
  useEffect(() => {
    const fetchAllVendorTransactions = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      // Fetch ALL purchase orders (including archived/completed) for Analytics
      // Deleted transactions are not in this table, so they're automatically excluded
      const {
        data,
        error
      } = await supabase.from('transactions').select(`
          *,
          vendors(name, category)
        `).in('type', ['purchase_order', 'expense']).order('due_date', {
        ascending: true
      });
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
    const channel = supabase.channel('vendor-transactions-analytics').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'transactions',
      filter: 'type=in.(purchase_order,expense)'
    }, () => {
      fetchAllVendorTransactions();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const {
    creditCards
  } = useCreditCards();
  const {
    amazonPayouts
  } = useAmazonPayouts();
  const {
    accounts
  } = useBankAccounts();
  const {
    recurringExpenses
  } = useRecurringExpenses();
  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 9, 1);
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);
  const [vendorDateRange, setVendorDateRange] = useState<string>("this-month");
  const [vendorViewType, setVendorViewType] = useState<"chart" | "numbers">("numbers");
  const [incomeDateRange, setIncomeDateRange] = useState<string>("this-month");
  const [customStartDate, setCustomStartDate] = useState<Date>(defaultStartDate);
  const [customEndDate, setCustomEndDate] = useState<Date>(defaultEndDate);

  // Helper to get date range
  const getDateRange = (rangeType: string) => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    switch (rangeType) {
      case "last-30-days":
        return {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now
        };
      case "custom":
        return {
          start: new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate(), 0, 0, 0, 0),
          end: new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate(), 23, 59, 59, 999)
        };
      case "this-month":
        return {
          start: startOfThisMonth,
          end: endOfThisMonth
        };
      case "last-month":
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        };
      case "last-2-months":
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          end: endOfThisMonth
        };
      case "last-3-months":
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 3, 1),
          end: endOfThisMonth
        };
      case "last-6-months":
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 6, 1),
          end: endOfThisMonth
        };
      case "ytd":
        return {
          start: startOfYear,
          end: endOfThisMonth
        };
      case "all-time":
        return {
          start: new Date(2020, 0, 1),
          // Far enough back to capture all data
          end: now
        };
      default:
        return {
          start: new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate(), 0, 0, 0, 0),
          end: new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate(), 23, 59, 59, 999)
        };
    }
  };

  // Calculate key metrics (MTD - Month to Date)
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Total inflow - actual money received via bank (no double-counting)
    const totalInflow = bankTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return tx.transactionType === 'credit' && txDate >= startOfMonth && txDate <= now;
    }).reduce((sum, tx) => sum + tx.amount, 0);

    // Total outflow - actual money spent via bank (no double-counting)
    const totalOutflow = bankTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return tx.transactionType === 'debit' && txDate >= startOfMonth && txDate <= now;
    }).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    // Forecasted Payouts - expected but not yet received
    const forecastedPayouts = amazonPayouts.filter(p => {
      const payoutDate = new Date(p.payout_date);
      return p.status === 'forecasted' && payoutDate >= startOfMonth && payoutDate <= endOfMonth;
    }).reduce((sum, p) => sum + (p.total_amount || 0), 0);

    // Amazon Payouts (confirmed MTD) - for reference
    const amazonRevenueFiltered = amazonPayouts.filter(p => {
      const payoutDate = new Date(p.payout_date);
      return p.status === 'confirmed' && payoutDate >= startOfMonth && payoutDate <= now;
    }).reduce((sum, p) => sum + (p.total_amount || 0), 0);

    // Current bank balance
    const currentBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Pending income
    const pendingIncome = incomeItems.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);

    // Credit card utilization
    const totalCreditLimit = creditCards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
    const totalCreditUsed = creditCards.reduce((sum, c) => sum + (c.balance || 0), 0);
    const creditUtilization = totalCreditLimit > 0 ? totalCreditUsed / totalCreditLimit * 100 : 0;

    // Total expenses from vendors + purchase orders + expenses
    const vendorExpenses = vendors.reduce((sum, v) => sum + (v.totalOwed || 0), 0);
    const purchaseOrdersAndExpenses = dbTransactions.filter(tx => (tx.type === 'purchase_order' || tx.type === 'expense') && tx.status === 'pending').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = vendorExpenses + purchaseOrdersAndExpenses;

    // Net cash flow
    const netCashFlow = totalInflow - totalOutflow;

    // Forecasted Income vs Expenses for this month
    // All confirmed payouts this month
    const confirmedPayoutsThisMonth = amazonPayouts.filter(p => {
      const payoutDate = new Date(p.payout_date);
      return p.status === 'confirmed' && payoutDate >= startOfMonth && payoutDate <= endOfMonth;
    }).reduce((sum, p) => sum + (p.total_amount || 0), 0);

    // Forecasted Amazon payouts (forecasted payouts this month)
    const forecastedAmazonPayouts = amazonPayouts.filter(p => {
      const payoutDate = new Date(p.payout_date);
      return p.status === 'forecasted' && payoutDate >= startOfMonth && payoutDate <= endOfMonth;
    }).reduce((sum, p) => sum + (p.total_amount || 0), 0);

    // Additional income (pending income items this month)
    const additionalIncome = incomeItems.filter(i => {
      const paymentDate = new Date(i.paymentDate);
      return i.status === 'pending' && paymentDate >= startOfMonth && paymentDate <= endOfMonth;
    }).reduce((sum, i) => sum + i.amount, 0);

    // Recurring income for this month
    const recurringIncome = recurringExpenses.filter(e => e.is_active && e.type === 'income').reduce((sum, e) => {
      const occurrences = generateRecurringDates(e as any, startOfMonth, endOfMonth);
      return sum + e.amount * occurrences.length;
    }, 0);
    const totalForecastedIncome = confirmedPayoutsThisMonth + forecastedAmazonPayouts + additionalIncome + recurringIncome;

    // All purchase orders and expenses this month
    const purchaseOrdersAndExpensesMonth = dbTransactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return (tx.type === 'purchase_order' || tx.type === 'expense') && txDate >= startOfMonth && txDate <= endOfMonth;
    }).reduce((sum, tx) => sum + tx.amount, 0);

    // All recurring expenses for this month
    const recurringExpensesThisMonth = recurringExpenses.filter(e => e.is_active && e.type === 'expense').reduce((sum, e) => {
      const occurrences = generateRecurringDates(e as any, startOfMonth, endOfMonth);
      return sum + e.amount * occurrences.length;
    }, 0);
    const totalForecastedExpenses = purchaseOrdersAndExpensesMonth + recurringExpensesThisMonth;
    return {
      totalInflow,
      totalOutflow,
      currentBalance,
      pendingIncome,
      creditUtilization,
      amazonRevenue,
      // Last 30 days GROSS revenue from hook
      amazonRevenueFiltered,
      // MTD NET payouts
      forecastedPayouts,
      totalExpenses,
      netCashFlow,
      totalForecastedIncome,
      totalForecastedExpenses
    };
  }, [bankTransactions, dbTransactions, incomeItems, vendors, creditCards, amazonPayouts, accounts, amazonRevenue, recurringExpenses]);

  // Revenue over time (last 6 months + next 2 months) - AMAZON PAYOUTS + separate additional income line
  const revenueData = useMemo(() => {
    const monthlyData: Record<string, {
      revenue: number;
      projected: number;
      otherIncome: number;
      isCurrentMonth: boolean;
    }> = {};
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const twoMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const currentMonthKey = now.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });

    // Initialize last 6 months + next 2 months (8 months total)
    for (let i = 5; i >= -2; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });
      monthlyData[key] = {
        revenue: 0,
        projected: 0,
        otherIncome: 0,
        isCurrentMonth: key === currentMonthKey
      };
    }

    // First pass: Calculate confirmed revenue for each month
    amazonPayouts.forEach(payout => {
      const date = new Date(payout.payout_date);
      if (date >= sixMonthsAgo && date <= twoMonthsAhead) {
        const key = date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        });
        if (monthlyData.hasOwnProperty(key)) {
          if (payout.status === 'confirmed') {
            monthlyData[key].revenue += payout.total_amount || 0;
          }
        }
      }
    });

    // Second pass: Calculate projected amounts
    // For current month: projected = forecasted only (what's still expected)
    // For past months: projected = 0 (no projection needed)
    // For future months: projected = forecasted only
    Object.keys(monthlyData).forEach(key => {
      const monthData = monthlyData[key];
      const monthDate = new Date(key);
      const isPastMonth = monthDate < new Date(now.getFullYear(), now.getMonth(), 1);
      const isFutureMonth = monthDate > new Date(now.getFullYear(), now.getMonth() + 1, 0);

      if (monthData.isCurrentMonth) {
        // Current month: forecasted only (what's still expected to come)
        const forecastedThisMonth = amazonPayouts
          .filter(p => {
            const pDate = new Date(p.payout_date);
            return p.status === 'forecasted' && pDate.getMonth() === monthDate.getMonth() && pDate.getFullYear() === monthDate.getFullYear();
          })
          .reduce((sum, p) => sum + (p.total_amount || 0), 0);
        
        monthData.projected = forecastedThisMonth;
      } else if (isPastMonth) {
        // Past months: no projection (already confirmed)
        monthData.projected = 0;
      } else if (isFutureMonth) {
        // Future months: projected = forecasted only
        const forecastedFutureMonth = amazonPayouts
          .filter(p => {
            const pDate = new Date(p.payout_date);
            return p.status === 'forecasted' && pDate.getMonth() === monthDate.getMonth() && pDate.getFullYear() === monthDate.getFullYear();
          })
          .reduce((sum, p) => sum + (p.total_amount || 0), 0);
        
        monthData.projected = forecastedFutureMonth;
      }
    });

    // Add non-Amazon income items to otherIncome line
    incomeItems.forEach(item => {
      if (item.source?.toLowerCase() !== 'amazon') {
        const paymentDate = new Date(item.paymentDate);
        if (paymentDate >= sixMonthsAgo && paymentDate <= twoMonthsAhead) {
          const key = paymentDate.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          });
          if (monthlyData.hasOwnProperty(key)) {
            monthlyData[key].otherIncome += item.amount;
          }
        }
      }
    });

    // Add completed sales orders to otherIncome line
    dbTransactions.forEach(tx => {
      if ((tx.type === 'sales_order' || tx.type === 'customer_payment') && tx.status === 'completed') {
        const date = new Date(tx.transactionDate);
        if (date >= sixMonthsAgo && date <= twoMonthsAhead) {
          const key = date.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          });
          if (monthlyData.hasOwnProperty(key)) {
            monthlyData[key].otherIncome += tx.amount;
          }
        }
      }
    });

    // Add recurring income for each month to otherIncome line
    const startOfMonth = (year: number, month: number) => new Date(year, month, 1);
    const endOfMonth = (year: number, month: number) => new Date(year, month + 1, 0, 23, 59, 59, 999);
    Object.keys(monthlyData).forEach(monthKey => {
      const monthDate = new Date(monthKey);
      const monthStart = startOfMonth(monthDate.getFullYear(), monthDate.getMonth());
      const monthEnd = endOfMonth(monthDate.getFullYear(), monthDate.getMonth());
      const recurringIncomeForMonth = recurringExpenses.filter(e => e.is_active && e.type === 'income').reduce((sum, e) => {
        const occurrences = generateRecurringDates(e as any, monthStart, monthEnd);
        return sum + e.amount * occurrences.length;
      }, 0);
      monthlyData[monthKey].otherIncome += recurringIncomeForMonth;
    });
    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      projected: data.projected,
      otherIncome: data.otherIncome,
      total: data.revenue + data.projected + data.otherIncome
    }));
  }, [amazonPayouts, incomeItems, dbTransactions, recurringExpenses]);

  // Income breakdown by source (filtered by date range)
  const incomeBySource = useMemo(() => {
    const {
      start,
      end
    } = getDateRange(incomeDateRange);
    const sourceData: Record<string, number> = {
      'Recurring Income': 0,
      'Amazon Payouts': 0,
      'Other Income': 0
    };

    // Income items filtered by payment date
    // Exclude Amazon source income since it's already counted from amazon_payouts table
    incomeItems.forEach(item => {
      const paymentDate = new Date(item.paymentDate);
      if (paymentDate >= start && paymentDate <= end) {
        if (item.isRecurring) {
          sourceData['Recurring Income'] += item.amount;
        } else if (item.source?.toLowerCase() === 'amazon') {
          // Skip Amazon - it's counted from amazon_payouts to avoid duplication
        } else if (item.category === 'Sales' || item.category === 'Sales Orders' || item.category === 'Customer Payments') {
          // Skip - these will be counted from dbTransactions to avoid duplication
        } else if (item.category) {
          sourceData[item.category] = (sourceData[item.category] || 0) + item.amount;
        } else {
          sourceData['Other Income'] += item.amount;
        }
      }
    });

    // Amazon payouts filtered by payout date (confirmed only, NET after fees)
    amazonPayouts.forEach(payout => {
      const payoutDate = new Date(payout.payout_date);
      if (payout.status === 'confirmed' && payoutDate >= start && payoutDate <= end) {
        sourceData['Amazon Payouts'] += payout.total_amount || 0;
      }
    });

    // Completed sales orders and customer payments filtered by transaction date
    // Use actual category from transaction - only include if category is set
    dbTransactions.forEach(tx => {
      const txDate = new Date(tx.transactionDate);
      if (txDate >= start && txDate <= end) {
        if ((tx.type === 'customer_payment' || tx.type === 'sales_order') && tx.status === 'completed' && tx.category) {
          sourceData[tx.category] = (sourceData[tx.category] || 0) + tx.amount;
        }
      }
    });
    return Object.entries(sourceData).map(([name, value]) => ({
      name,
      value
    })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  }, [incomeItems, amazonPayouts, dbTransactions, incomeDateRange, customStartDate, customEndDate]);

  // Purchase Orders breakdown by vendor category (inventory, goods)
  const purchaseOrderCategoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const {
      start,
      end
    } = getDateRange(vendorDateRange);
    console.log('📊 Purchase Order Analytics Debug:', {
      dateRange: vendorDateRange,
      start: start.toISOString(),
      end: end.toISOString(),
      totalVendorTransactions: vendorTransactions.length
    });

    // Add amounts from vendor transactions (purchase orders) - ONLY include if due date is in the selected range
    vendorTransactions.forEach(tx => {
      const dueDate = new Date(tx.dueDate);
      const isInRange = dueDate >= start && dueDate <= end;
      if (isInRange && tx.status !== 'cancelled' && tx.category && tx.category.trim()) {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
      }
    });
    console.log('📊 Purchase Order Category totals:', categoryTotals);
    return Object.entries(categoryTotals).map(([category, total]) => ({
      name: category,
      value: total
    })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  }, [vendorTransactions, vendorDateRange, customStartDate, customEndDate]);

  // Recurring Expenses breakdown by category (employee costs, software, etc.)
  const recurringExpenseCategoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const {
      start,
      end
    } = getDateRange(vendorDateRange);
    console.log('📊 Recurring Expense Analytics Debug:', {
      dateRange: vendorDateRange,
      start: start.toISOString(),
      end: end.toISOString(),
      totalRecurringExpenses: recurringExpenses.length
    });

    // Add amounts from recurring expenses within the date range
    recurringExpenses.forEach(expense => {
      if (!expense.is_active || expense.type !== 'expense') return;

      // Calculate actual occurrences within the date range
      const occurrences = generateRecurringDates(expense, start, end);
      if (occurrences.length > 0 && expense.category && expense.category.trim()) {
        const totalAmount = occurrences.length * (expense.amount || 0);
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + totalAmount;
      }
    });
    console.log('📊 Recurring Expense Category totals:', categoryTotals);
    return Object.entries(categoryTotals).map(([category, total]) => ({
      name: category,
      value: total
    })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
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
    return Object.entries(categoryTotals).map(([category, total]) => ({
      name: category,
      value: total
    })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  }, [purchaseOrderCategoryData, recurringExpenseCategoryData]);

  // Top vendors by spending
  const topVendors = useMemo(() => {
    const vendorTotals: Record<string, number> = {};
    const {
      start,
      end
    } = getDateRange(vendorDateRange);

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
    return Object.entries(vendorTotals).map(([name, amount]) => ({
      name,
      amount
    })).sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [vendors, vendorTransactions, vendorDateRange, customStartDate, customEndDate]);

  // Cash flow trend (income vs expenses over time)
  const cashFlowData = useMemo(() => {
    const monthlyData: Record<string, {
      income: number;
      expenses: number;
    }> = {};
    const now = new Date();

    // Initialize last 6 months + next 2 months (8 months total)
    for (let i = 5; i >= -2; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', {
        month: 'short'
      });
      monthlyData[key] = {
        income: 0,
        expenses: 0
      };
    }

    // Aggregate income from received income items
    incomeItems.forEach(item => {
      const date = new Date(item.paymentDate);
      const key = date.toLocaleDateString('en-US', {
        month: 'short'
      });
      if (monthlyData[key]) {
        monthlyData[key].income += item.amount;
      }
    });

    // Aggregate income from completed sales orders
    dbTransactions.forEach(tx => {
      if ((tx.type === 'sales_order' || tx.type === 'customer_payment') && tx.status === 'completed') {
        const date = new Date(tx.transactionDate);
        const key = date.toLocaleDateString('en-US', {
          month: 'short'
        });
        if (monthlyData[key]) {
          monthlyData[key].income += tx.amount;
        }
      }
    });

    // Add Amazon payouts (confirmed only - actual payouts received)
    amazonPayouts.forEach(payout => {
      if (payout.status === 'confirmed') {
        const date = new Date(payout.payout_date);
        const key = date.toLocaleDateString('en-US', {
          month: 'short'
        });
        if (monthlyData[key]) {
          monthlyData[key].income += payout.total_amount || 0;
        }
      }
    });

    // Add recurring income for each month (including future months)
    Object.keys(monthlyData).forEach((monthKey, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      const recurringIncome = recurringExpenses.filter(r => r.type === 'income' && r.is_active).reduce((sum, r) => {
        const occurrences = generateRecurringDates(r, monthStart, monthEnd);
        return sum + occurrences.length * r.amount;
      }, 0);
      monthlyData[monthKey].income += recurringIncome;
    });

    // Aggregate expenses from bank transactions (debit)
    bankTransactions.forEach(tx => {
      if (tx.transactionType === 'debit') {
        const date = new Date(tx.date);
        const key = date.toLocaleDateString('en-US', {
          month: 'short'
        });
        if (monthlyData[key]) {
          monthlyData[key].expenses += tx.amount;
        }
      }
    });

    // Aggregate expenses from purchase orders, expenses, and vendor payments
    dbTransactions.forEach(tx => {
      if ((tx.type === 'purchase_order' || tx.type === 'expense' || tx.type === 'vendor_payment') && tx.status !== 'cancelled') {
        const date = new Date(tx.transactionDate);
        const key = date.toLocaleDateString('en-US', {
          month: 'short'
        });
        if (monthlyData[key]) {
          monthlyData[key].expenses += tx.amount;
        }
      }
    });

    // Add recurring expenses for each month (including future months)
    Object.keys(monthlyData).forEach((monthKey, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      const recurringExpense = recurringExpenses.filter(r => r.type === 'expense' && r.is_active).reduce((sum, r) => {
        const occurrences = generateRecurringDates(r, monthStart, monthEnd);
        return sum + occurrences.length * r.amount;
      }, 0);
      monthlyData[monthKey].expenses += recurringExpense;
    });
    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses
    }));
  }, [incomeItems, bankTransactions, dbTransactions, amazonPayouts]);

  // End of month balances calculation - REAL historical data
  const endOfMonthBalances = useMemo(() => {
    const now = new Date();
    const currentBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    
    // Find earliest bank transaction date (bank transactions are the source of truth)
    const bankDates = bankTransactions.map(tx => new Date(tx.date));
    if (bankDates.length === 0) {
      return []; // No bank transaction data
    }
    
    const earliestDate = new Date(Math.min(...bankDates.map(d => d.getTime())));
    const earliestMonth = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    
    // Build months from earliest to current
    const monthlyBalances: Record<string, { income: number; expenses: number }> = {};
    const months: string[] = [];
    
    let currentMonth = new Date(earliestMonth);
    const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    while (currentMonth <= nowMonth) {
      const key = currentMonth.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });
      monthlyBalances[key] = { income: 0, expenses: 0 };
      months.push(key);
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    // Aggregate all income sources by month
    incomeItems.forEach(item => {
      if (item.status === 'received') {
        const date = new Date(item.paymentDate);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyBalances[key]) {
          monthlyBalances[key].income += item.amount;
        }
      }
    });
    
    amazonPayouts.forEach(payout => {
      if (payout.status === 'confirmed') {
        const date = new Date(payout.payout_date);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyBalances[key]) {
          monthlyBalances[key].income += payout.total_amount || 0;
        }
      }
    });
    
    dbTransactions.forEach(tx => {
      if ((tx.type === 'sales_order' || tx.type === 'customer_payment') && tx.status === 'completed') {
        const date = new Date(tx.transactionDate);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyBalances[key]) {
          monthlyBalances[key].income += tx.amount;
        }
      }
    });
    
    // Aggregate all expense sources by month
    vendorTransactions.forEach(tx => {
      if (tx.status === 'completed' || tx.status === 'paid') {
        const date = new Date(tx.transactionDate);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyBalances[key]) {
          monthlyBalances[key].expenses += tx.amount;
        }
      }
    });
    
    bankTransactions.forEach(tx => {
      const date = new Date(tx.date);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyBalances[key]) {
        if (tx.transactionType === 'credit') {
          monthlyBalances[key].income += tx.amount;
        } else {
          monthlyBalances[key].expenses += tx.amount;
        }
      }
    });
    
    // Calculate forward from earliest month
    // Start with 0 and build up the running balance
    const results: { month: string; balance: number }[] = [];
    let runningBalance = 0;
    
    months.forEach(month => {
      const data = monthlyBalances[month];
      const netChange = data.income - data.expenses;
      runningBalance += netChange;
      results.push({ month, balance: runningBalance });
    });
    
    // Adjust all balances so current month matches actual current balance
    const lastCalculatedBalance = results[results.length - 1]?.balance || 0;
    const adjustment = currentBalance - lastCalculatedBalance;
    
    return results.map(r => ({
      month: r.month,
      balance: r.balance + adjustment
    }));
  }, [accounts, incomeItems, amazonPayouts, dbTransactions, vendorTransactions, bankTransactions]);

  const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];
  
  const handleDownloadPDF = async () => {
    toast({
      title: "Generating PDF report...",
      description: "This may take a few moments"
    });
    
    // Hide the download button temporarily
    const downloadButton = document.querySelector('[data-download-button]') as HTMLElement;
    if (downloadButton) {
      downloadButton.style.display = 'none';
    }
    
    // Initialize PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const footerHeight = 15;
    const availableHeight = pageHeight - footerHeight - (margin * 2);
    
    let currentY = margin;
    let pageNumber = 1;
    
    // Helper function to add section
    const addSection = async (selector: string, spaceBefore = 5) => {
      const element = document.querySelector(selector) as HTMLElement;
      if (!element) {
        console.log(`Section not found: ${selector}`);
        return;
      }
      
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Check if we need a new page
        if (currentY + imgHeight + spaceBefore > pageHeight - footerHeight - margin) {
          addFooter(pdf, pageWidth, pageHeight, pageNumber);
          pdf.addPage();
          pageNumber++;
          currentY = margin;
        } else {
          currentY += spaceBefore;
        }
        
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, currentY, imgWidth, imgHeight, undefined, 'FAST');
        currentY += imgHeight;
      } catch (error) {
        console.error(`Error capturing section ${selector}:`, error);
      }
    };
    
    try {
      // Capture sections in order
      await addSection('[data-pdf-section="header"]', 0);
      await addSection('[data-pdf-section="metrics-top"]', 5);
      await addSection('[data-pdf-section="income-metrics"]', 5);
      await addSection('[data-pdf-section="metrics-bottom"]', 5);
      await addSection('[data-pdf-section="income-expense-breakdown"]', 8);
      await addSection('[data-pdf-section="balance-chart"]', 8);
      await addSection('[data-pdf-section="vendors-table"]', 8);
      await addSection('[data-pdf-section="income-trend-chart"]', 8);
      await addSection('[data-pdf-section="payment-status"]', 8);
      await addSection('[data-pdf-section="income-expense-chart"]', 8);
      await addSection('[data-pdf-section="cashflow-chart"]', 8);
      
      // Add final footer
      addFooter(pdf, pageWidth, pageHeight, pageNumber);
      
      // Show download button
      if (downloadButton) {
        downloadButton.style.display = '';
      }
      
      // Save PDF
      pdf.save(`Auren-Analytics-Report-${format(new Date(), 'MMMM-yyyy')}.pdf`);
      toast({
        title: "Success!",
        description: "PDF report generated successfully"
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive"
      });
      if (downloadButton) {
        downloadButton.style.display = '';
      }
    }
  };
  
  const addFooter = (pdf: jsPDF, pageWidth: number, pageHeight: number, pageNumber: number) => {
    // Load and add Auren logo
    const logoImg = new Image();
    logoImg.src = '/auren-icon-blue.png';
    
    // Add logo (small, on the left)
    try {
      pdf.addImage(logoImg, 'PNG', 10, pageHeight - 12, 8, 8);
    } catch (e) {
      console.log('Could not add logo to PDF');
    }
    
    // Add "Powered by Auren" text
    pdf.setFontSize(9);
    pdf.setTextColor(59, 130, 246); // Blue color
    pdf.setFont('helvetica', 'normal');
    pdf.text('Powered by Auren', 20, pageHeight - 7);
    
    // Add page number on the right
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Page ${pageNumber}`, pageWidth - 20, pageHeight - 7, { align: 'right' });
  };
  
  return <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20" data-pdf-section="header">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-primary">Business Analytics</h1>
          <p className="text-lg font-medium text-primary/80 mt-1">{format(new Date(), 'MMMM yyyy')}</p>
          <p className="text-muted-foreground mt-2">Comprehensive insights into your financial performance</p>
        </div>
        <Button onClick={handleDownloadPDF} className="gap-2 flex-shrink-0 ml-4 bg-primary hover:bg-primary/90" data-download-button>
          <Download className="h-4 w-4" />
          Download PDF Report
        </Button>
      </div>

      {/* Cash Flow Overview Section */}
      <Card data-pdf-section="metrics-top">
        <CardHeader>
          <CardTitle className="text-xl">Cash Flow Overview</CardTitle>
          <p className="text-sm text-muted-foreground">Month-to-date actual bank activity</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-blue-200 dark:border-blue-900/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.currentBalance)}</div>
                <p className="text-xs text-muted-foreground">All accounts</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 dark:border-green-900/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inflow</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalInflow)}</div>
                <p className="text-xs text-muted-foreground">Actual bank credits</p>
              </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-900/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Outflow</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalOutflow)}</div>
                <p className="text-xs text-muted-foreground">Actual bank debits</p>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metrics.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.netCashFlow >= 0 ? '+' : ''}{formatCurrency(metrics.netCashFlow)}
                </div>
                <p className="text-xs text-muted-foreground">Month to date</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Income Metrics Section */}
      <Card data-pdf-section="income-metrics">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">Income & Receivables</CardTitle>
              <p className="text-sm text-muted-foreground">Expected and confirmed income streams</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">Total Projected This Month</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(
                  metrics.forecastedPayouts + 
                  metrics.pendingIncome + 
                  recurringExpenses.filter(r => r.type === 'income' && r.is_active).reduce((sum, r) => {
                    const occurrences = generateRecurringDates(r, new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
                    return sum + occurrences.length * r.amount;
                  }, 0)
                )}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-amber-200 dark:border-amber-900/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Forecasted Amazon</CardTitle>
                <CalendarIcon className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(metrics.forecastedPayouts)}</div>
                <p className="text-xs text-muted-foreground">Expected this month</p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 dark:border-purple-900/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed Amazon</CardTitle>
                <Package className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.amazonRevenueFiltered)}</div>
                <p className="text-xs text-muted-foreground">Received MTD</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 dark:border-green-900/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Income</CardTitle>
                <CalendarIcon className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.pendingIncome)}</div>
                <p className="text-xs text-muted-foreground">Other expected</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-900/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recurring Income</CardTitle>
                <Calculator className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${formatCurrency(recurringExpenses.filter(r => r.type === 'income' && r.is_active).reduce((sum, r) => {
                    const occurrences = generateRecurringDates(r, new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
                    return sum + occurrences.length * r.amount;
                  }, 0)).replace('$', '')}
                </div>
                <p className="text-xs text-muted-foreground">Monthly recurring</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Account Health Section */}
      <Card data-pdf-section="metrics-bottom">
        <CardHeader>
          <CardTitle className="text-xl">Account Health & Liabilities</CardTitle>
          <p className="text-sm text-muted-foreground">Current balances and obligations</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-orange-200 dark:border-orange-900/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credit Utilization</CardTitle>
                <CreditCardIcon className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{metrics.creditUtilization.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(creditCards.reduce((sum, cc) => sum + (cc.balance || 0), 0))} of{' '}
                  {formatCurrency(creditCards.reduce((sum, cc) => sum + (cc.credit_limit || 0), 0))}
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 dark:border-amber-900/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(dbTransactions.filter(tx => (tx.type === 'purchase_order' || tx.type === 'expense') && tx.status === 'pending').reduce((sum, tx) => sum + tx.amount, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dbTransactions.filter(tx => (tx.type === 'purchase_order' || tx.type === 'expense') && tx.status === 'pending').length} pending
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 dark:border-amber-900/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
                <Target className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency((() => {
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    
                    // Get all pending purchase orders and expenses this month
                    const pendingPOsAndExpenses = dbTransactions.filter(tx => {
                      const txDate = new Date(tx.transactionDate);
                      return (tx.type === 'purchase_order' || tx.type === 'expense') && 
                             tx.status === 'pending' && 
                             txDate >= startOfMonth && 
                             txDate <= endOfMonth;
                    });
                    
                    return pendingPOsAndExpenses.reduce((sum, tx) => sum + tx.amount, 0);
                  })())}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    
                    const allPending = dbTransactions.filter(tx => {
                      const txDate = new Date(tx.transactionDate);
                      return (tx.type === 'purchase_order' || tx.type === 'expense') && 
                             tx.status === 'pending' && 
                             txDate >= startOfMonth && 
                             txDate <= endOfMonth;
                    });
                    
                    const pending = allPending.filter(tx => new Date(tx.transactionDate) > now).length;
                    const overdue = allPending.filter(tx => new Date(tx.transactionDate) <= now).length;
                    
                    return `${pending} pending, ${overdue} overdue`;
                  })()}
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-900/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recurring Expenses</CardTitle>
                <Calculator className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(recurringExpenses.filter(r => r.type === 'expense' && r.is_active).reduce((sum, r) => {
                    const occurrences = generateRecurringDates(r, new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
                    return sum + occurrences.length * r.amount;
                  }, 0))}
                </div>
                <p className="text-xs text-muted-foreground">Monthly recurring</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2" data-pdf-section="income-expense-breakdown">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle>Income Breakdown by Source</CardTitle>
                  <div className="flex gap-2 items-center">
                    <Select value={incomeDateRange} onValueChange={setIncomeDateRange}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-background border border-border shadow-lg">
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
                    <Pie data={incomeBySource} cx="50%" cy="50%" labelLine={false} label={({
                  name,
                  percent
                }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                      {incomeBySource.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip 
                      formatter={value => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">Total Income by Source</h4>
                  {incomeBySource.map((source, index) => <div key={source.name} className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{
                    backgroundColor: COLORS[index % COLORS.length]
                  }} />
                        <span className="text-sm font-medium">{source.name}</span>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(source.value)}</span>
                    </div>)}
                  {incomeBySource.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No income in this period</p>}
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
                    <SelectContent className="z-[100] bg-background border border-border shadow-lg">
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
                    <Pie data={vendorCategoryData} cx="50%" cy="50%" labelLine={false} label={({
                  name,
                  percent
                }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                      {vendorCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip 
                      formatter={value => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">Total Spending by Category</h4>
                  {vendorCategoryData.map((category, index) => <div key={category.name} className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{
                    backgroundColor: COLORS[index % COLORS.length]
                  }} />
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(category.value)}</span>
                    </div>)}
                  {vendorCategoryData.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No expenses in this period</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* End of Month Balances Chart */}
          <Card data-pdf-section="balance-chart">
            <CardHeader>
              <CardTitle>End of Month Bank Balances</CardTitle>
            </CardHeader>
            <CardContent>
              {endOfMonthBalances.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <p className="text-lg font-medium mb-2">Not enough data</p>
                    <p className="text-sm">Complete transactions are needed to display balance history</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={endOfMonthBalances}>
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => {
                        const absValue = Math.abs(value);
                        if (absValue >= 1000) {
                          return `$${(value / 1000).toFixed(0)}k`;
                        }
                        return `$${value.toFixed(0)}`;
                      }}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const balance = Number(payload[0].value) || 0;
                          return (
                            <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                              <p className="font-medium text-foreground mb-2">{label}</p>
                              <div className="flex justify-between gap-4 text-sm">
                                <span style={{ color: payload[0].color }}>Balance:</span>
                                <span className="font-medium">{formatCurrency(balance)}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-sm mt-2 pt-2 border-t border-border">
                                <span className="font-semibold">Total:</span>
                                <span className="font-semibold">{formatCurrency(balance)}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#balanceGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card data-pdf-section="vendors-table">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top 10 Vendors by Spending</CardTitle>
                <div className="flex items-center gap-2">
                  <ToggleGroup type="single" value={vendorViewType} onValueChange={value => value && setVendorViewType(value as "chart" | "numbers")}>
                    <ToggleGroupItem value="chart" aria-label="Bar chart view">
                      <BarChart3 className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="numbers" aria-label="Numbers view">
                      <Hash className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
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
              </div>
            </CardHeader>
            <CardContent>
              {vendorViewType === "chart" ? <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topVendors} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip 
                      formatter={value => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="amount" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer> : <div className="space-y-2">
                  {topVendors.map((vendor, index) => <div key={vendor.name} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm", index === 0 && "bg-amber-500/20 text-amber-700 dark:text-amber-400", index === 1 && "bg-slate-500/20 text-slate-700 dark:text-slate-400", index === 2 && "bg-orange-500/20 text-orange-700 dark:text-orange-400", index > 2 && "bg-muted text-muted-foreground")}>
                          #{index + 1}
                        </div>
                        <span className="font-medium">{vendor.name}</span>
                      </div>
                      <span className="text-lg font-bold">{formatCurrency(vendor.amount)}</span>
                    </div>)}
                  {topVendors.length === 0 && <div className="text-center text-muted-foreground py-8">
                      No vendor spending data for this period
                    </div>}
                </div>}
            </CardContent>
          </Card>

          <Card data-pdf-section="income-trend-chart">
            <CardHeader>
              <CardTitle>Monthly Income Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={({
                active,
                payload,
                label
              }) => {
                if (active && payload && payload.length) {
                  // Find the total value directly instead of summing all entries (which would double count)
                  const totalEntry = payload.find(entry => entry.dataKey === 'total');
                  const total = totalEntry ? Number(totalEntry.value) : 0;
                  
                  return <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                            <p className="font-medium text-foreground mb-2">{label}</p>
                            {payload.map((entry, index) => <div key={index} className="flex justify-between gap-4 text-sm">
                                <span style={{
                        color: entry.color
                      }}>{entry.name}:</span>
                                <span className="font-medium">{formatCurrency(Number(entry.value))}</span>
                              </div>)}
                          </div>;
                }
                return null;
              }} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Amazon Confirmed" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="projected" name="Amazon Projected" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="otherIncome" name="Other Income" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="total" name="Total Income" stroke="#3b82f6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card data-pdf-section="payment-status">
            <CardHeader>
              <CardTitle>Payment Status Overview</CardTitle>
              <p className="text-sm text-muted-foreground">This month only</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <span className="font-medium">Overdue</span>
                  <div className="text-right">
                    <div className="text-red-600 font-bold">
                      {vendorTransactions.filter(tx => {
                        const txDate = new Date(tx.dueDate);
                        const now = new Date();
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                        return tx.status === 'overdue' && txDate >= startOfMonth && txDate <= endOfMonth;
                      }).length} purchase orders
                    </div>
                    <div className="text-sm text-red-600 font-semibold">
                      {formatCurrency(vendorTransactions.filter(tx => {
                        const txDate = new Date(tx.dueDate);
                        const now = new Date();
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                        return tx.status === 'overdue' && txDate >= startOfMonth && txDate <= endOfMonth;
                      }).reduce((sum, tx) => sum + Number(tx.amount || 0), 0))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <span className="font-medium">Pending</span>
                  <div className="text-right">
                    <div className="text-amber-600 font-bold">
                      {vendorTransactions.filter(tx => {
                        const txDate = new Date(tx.dueDate);
                        const now = new Date();
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                        return tx.status === 'pending' && txDate >= startOfMonth && txDate <= endOfMonth;
                      }).length} purchase orders
                    </div>
                    <div className="text-sm text-amber-600 font-semibold">
                      {formatCurrency(vendorTransactions.filter(tx => {
                        const txDate = new Date(tx.dueDate);
                        const now = new Date();
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                        return tx.status === 'pending' && txDate >= startOfMonth && txDate <= endOfMonth;
                      }).reduce((sum, tx) => sum + Number(tx.amount || 0), 0))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <span className="font-medium">Scheduled</span>
                  <div className="text-right">
                    <div className="text-blue-600 font-bold">
                      {vendorTransactions.filter(tx => {
                        const txDate = new Date(tx.dueDate);
                        const now = new Date();
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                        return tx.status === 'scheduled' && txDate >= startOfMonth && txDate <= endOfMonth;
                      }).length} purchase orders
                    </div>
                    <div className="text-sm text-blue-600 font-semibold">
                      {formatCurrency(vendorTransactions.filter(tx => {
                        const txDate = new Date(tx.dueDate);
                        const now = new Date();
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                        return tx.status === 'scheduled' && txDate >= startOfMonth && txDate <= endOfMonth;
                      }).reduce((sum, tx) => sum + Number(tx.amount || 0), 0))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <span className="font-medium">Completed</span>
                  <div className="text-right">
                    <div className="text-green-600 font-bold">
                      {vendorTransactions.filter(tx => {
                        const txDate = new Date(tx.dueDate);
                        const now = new Date();
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                        return tx.status === 'completed' && txDate >= startOfMonth && txDate <= endOfMonth;
                      }).length} purchase orders
                    </div>
                    <div className="text-sm text-green-600 font-semibold">
                      {formatCurrency(vendorTransactions.filter(tx => {
                        const txDate = new Date(tx.dueDate);
                        const now = new Date();
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                        return tx.status === 'completed' && txDate >= startOfMonth && txDate <= endOfMonth;
                      }).reduce((sum, tx) => sum + Number(tx.amount || 0), 0))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-pdf-section="income-expense-chart">
            <CardHeader>
              <CardTitle>Income vs Expenses (Last 6 Months + Next 2 Months Projected)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const net = data.income - data.expenses;
                        return (
                          <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold mb-2 text-foreground">{data.month}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between gap-4">
                                <span className="text-green-600">Income:</span>
                                <span className="font-medium text-foreground">{formatCurrency(data.income)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-red-600">Expenses:</span>
                                <span className="font-medium text-foreground">{formatCurrency(data.expenses)}</span>
                              </div>
                              <div className="flex justify-between gap-4 pt-1 border-t border-border">
                                <span className={net >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>Net:</span>
                                <span className={net >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{formatCurrency(net)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card data-pdf-section="cashflow-chart">
            <CardHeader>
              <CardTitle>Net Cash Flow Trend (Last 6 Months + Next 2 Months Projected)</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                <span className="inline-block w-3 h-3 bg-orange-500 rounded mr-1"></span>
                Orange bars indicate months without expense data
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold mb-2 text-foreground">{data.month}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between gap-4">
                                <span className="text-green-600">Income:</span>
                                <span className="font-medium text-foreground">{formatCurrency(data.income)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-red-600">Expenses:</span>
                                <span className="font-medium text-foreground">{formatCurrency(data.expenses)}</span>
                              </div>
                              <div className="flex justify-between gap-4 pt-1 border-t border-border">
                                <span className={data.net >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>Net:</span>
                                <span className={data.net >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{formatCurrency(data.net)}</span>
                              </div>
                              {data.expenses === 0 && (
                                <div className="text-xs text-orange-600 mt-1 pt-1 border-t border-border">
                                  ⚠ No expenses recorded for this month
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="net" fill="#8b5cf6">
                    {cashFlowData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.expenses === 0 ? '#f97316' : (entry.net >= 0 ? '#10b981' : '#ef4444')} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
      </div>
    </div>;
}