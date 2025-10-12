import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, Wallet, CreditCard, Building2, CalendarIcon, TrendingUp, ShoppingBag, AlertTriangle } from "lucide-react";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useUserSettings } from "@/hooks/useUserSettings";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, subDays, addDays, startOfWeek, endOfWeek, getDay, startOfDay } from "date-fns";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TransactionDetailModal } from "./transaction-detail-modal";
import { DayTransactionsModal } from "./day-transactions-modal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PendingNotificationsPanel } from "./pending-notifications-panel";

interface CashFlowEvent {
  id: string;
  type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
  amount: number;
  description: string;
  vendor?: string;
  creditCard?: string;
  poName?: string;
  source?: string; // Added to identify Amazon payouts
  date: Date;
}

interface IncomeItem {
  id: string;
  amount: number;
  paymentDate: Date;
  status: 'received' | 'pending' | 'overdue';
  description: string;
  source: string;
}

interface Vendor {
  id: string;
  name: string;
  totalOwed: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
  status: string;
  poName?: string;
}

interface CashFlowCalendarProps {
  events?: CashFlowEvent[];
  totalCash?: number;
  onEditTransaction?: (transaction: CashFlowEvent) => void;
  onUpdateTransactionDate?: (transactionId: string, newDate: Date, eventType: 'vendor' | 'income') => Promise<void>;
  todayInflow?: number;
  todayOutflow?: number;
  upcomingExpenses?: number;
  incomeItems?: IncomeItem[];
  bankAccountBalance?: number;
  vendors?: Vendor[];
  onVendorClick?: (vendor: Vendor) => void;
  onIncomeClick?: (income: IncomeItem) => void;
  reserveAmount?: number;
}

export const CashFlowCalendar = ({ 
  events: propEvents = [], 
  totalCash = 0, 
  onEditTransaction,
  onUpdateTransactionDate,
  todayInflow = 0,
  todayOutflow = 0,
  upcomingExpenses = 0,
  incomeItems = [],
  bankAccountBalance = 0,
  vendors = [],
  onVendorClick,
  onIncomeClick,
  reserveAmount = 0,
}: CashFlowCalendarProps) => {
  const { totalAvailableCredit } = useCreditCards();
  const { chartPreferences, updateChartPreferences } = useUserSettings();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'calendar' | 'chart'>('chart');
  const [chartTimeRange, setChartTimeRange] = useState<'1' | '3' | '6' | '12'>('3');
  const [chartType, setChartType] = useState<'bar' | 'line'>('line');
  const [selectedTransaction, setSelectedTransaction] = useState<CashFlowEvent | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedDayTransactions, setSelectedDayTransactions] = useState<CashFlowEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayTransactionsModal, setShowDayTransactionsModal] = useState(false);
  const [draggedTransaction, setDraggedTransaction] = useState<CashFlowEvent | null>(null);
  const [showCashFlowLine, setShowCashFlowLine] = useState(chartPreferences.showCashFlowLine);
  const [showTotalResourcesLine, setShowTotalResourcesLine] = useState(chartPreferences.showTotalResourcesLine);
  const [showCreditCardLine, setShowCreditCardLine] = useState(chartPreferences.showCreditCardLine);
  const [showReserveLine, setShowReserveLine] = useState(chartPreferences.showReserveLine);
  const [showForecastLine, setShowForecastLine] = useState(chartPreferences.showForecastLine);
  const [cashFlowColor, setCashFlowColor] = useState(chartPreferences.cashFlowColor);
  const [totalResourcesColor, setTotalResourcesColor] = useState(chartPreferences.totalResourcesColor);
  const [creditCardColor, setCreditCardColor] = useState(chartPreferences.creditCardColor);
  const [reserveColor, setReserveColor] = useState(chartPreferences.reserveColor);
  const [forecastColor, setForecastColor] = useState(chartPreferences.forecastColor);
  
  // Sync local state with loaded preferences
  useEffect(() => {
    setShowCashFlowLine(chartPreferences.showCashFlowLine);
    setShowTotalResourcesLine(chartPreferences.showTotalResourcesLine);
    setShowCreditCardLine(chartPreferences.showCreditCardLine);
    setShowReserveLine(chartPreferences.showReserveLine);
    setShowForecastLine(chartPreferences.showForecastLine);
    setCashFlowColor(chartPreferences.cashFlowColor);
    setTotalResourcesColor(chartPreferences.totalResourcesColor);
    setCreditCardColor(chartPreferences.creditCardColor);
    setReserveColor(chartPreferences.reserveColor);
    setForecastColor(chartPreferences.forecastColor);
  }, [chartPreferences]);
  
  // Total available cash baseline comes from Overview (displayCash)
  const totalAvailableCash = totalCash;
  
  // Account start date (inclusive)
  const accountStartDate = new Date('2025-09-29');
  accountStartDate.setHours(0, 0, 0, 0);
  
  // Filter events to only those on/after the account start date
  let events = propEvents.filter(e => {
    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);
    return d >= accountStartDate;
  });

  // Automatically filter out overdue unmatched transactions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  events = events.filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    
    // Keep future events
    if (eventDate >= today) return true;
    
    // For past events, check if they're matched/received
    // If it's an income event, check if corresponding income item is received
    if (event.type === 'inflow') {
      const correspondingIncome = incomeItems.find(income => 
        income.description === event.description &&
        Math.abs(income.amount - event.amount) < 0.01
      );
      // Keep if received, filter out if pending/overdue
      return correspondingIncome?.status === 'received';
    }
    
    // For vendor/purchase-order events, check if corresponding vendor is paid
    if (event.type === 'purchase-order' || event.vendor) {
      const correspondingVendor = vendors.find(vendor =>
        vendor.name === event.vendor || vendor.poName === event.poName
      );
      // Keep if paid, filter out if not paid
      return correspondingVendor?.status === 'paid';
    }
    
    // Keep all other event types (credit payments, recurring, etc.)
    return true;
  });

  // Hide calendar monetary summaries if there's no user data
  const hasAnyData = events.length > 0 || (incomeItems?.length ?? 0) > 0;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Always show current month view
  const calendarStartWithWeek = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday = 0
  const calendarEndWithWeek = endOfWeek(monthEnd, { weekStartsOn: 0 });
     
  const days = eachDayOfInterval({ start: calendarStartWithWeek, end: calendarEndWithWeek });

  const weeksInView = Math.ceil(days.length / 7);
  const is6Rows = weeksInView > 5;
  const gridRowsClass = is6Rows ? 'grid-rows-6' : 'grid-rows-5';
  const cellHeightClass = is6Rows ? 'h-[70px]' : 'h-[85px]';

  const getEventsForDay = (date: Date) => {
    return events.filter(event => 
      format(event.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const getDayBalance = (date: Date) => {
    const dayEvents = getEventsForDay(date);
    return dayEvents.reduce((total, event) => {
      return total + (event.type === 'inflow' ? event.amount : -event.amount);
    }, 0);
  };

  // Get pending income - only show on TODAY if not yet received
  const getPendingIncomeForToday = (date: Date) => {
    const checkDate = startOfDay(new Date(date));
    const today = startOfDay(new Date());
    
    // Only show pending on today
    if (checkDate.getTime() !== today.getTime()) return 0;

    // Get pending from regular income items
    const regularPending = incomeItems
      .filter(income => {
        if (income.status === 'received') return false;
        const incomeDate = startOfDay(new Date(income.paymentDate));
        // Only show pending if due date is today or earlier (past/current, not future)
        return incomeDate <= today;
      })
      .reduce((sum, income) => sum + income.amount, 0);

  // Get recurring income events that are due today or earlier
  const recurringPending = events
    .filter(event => {
      if (!event.id.startsWith('recurring-')) return false;
      if (event.type !== 'inflow') return false;
      const eventDate = startOfDay(new Date(event.date));
      // Only include if due date is today or earlier
      return eventDate <= today;
    })
    .reduce((sum, event) => sum + event.amount, 0);

  return regularPending + recurringPending;
  };

  // Get overdue income - only show on TODAY
  const getOverdueIncomeForToday = (date: Date) => {
    const checkDate = startOfDay(new Date(date));
    const today = startOfDay(new Date());
    
    // Only show overdue on today
    if (checkDate.getTime() !== today.getTime()) return 0;

    // Get overdue from regular income items
    const regularOverdue = incomeItems
      .filter(income => {
        if (income.status === 'received') return false;
        const incomeDate = startOfDay(new Date(income.paymentDate));
        // Overdue if payment date is before today
        return incomeDate < today;
      })
      .reduce((sum, income) => sum + income.amount, 0);

    // Get overdue from recurring income events
    const recurringOverdue = events
      .filter(event => {
        if (!event.id.startsWith('recurring-')) return false;
        if (event.type !== 'inflow') return false;
        const eventDate = startOfDay(new Date(event.date));
        // Overdue if payment date is before today
        return eventDate < today;
      })
      .reduce((sum, event) => sum + event.amount, 0);

    return regularOverdue + recurringOverdue;
  };

  // Get overdue vendor payments - only show on TODAY
  const getOverdueVendorsForToday = (date: Date) => {
    const checkDate = startOfDay(new Date(date));
    const today = startOfDay(new Date());
    
    // Only show overdue on today
    if (checkDate.getTime() !== today.getTime()) return 0;

    return vendors
      .filter(vendor => {
        if (vendor.status === 'paid' || vendor.totalOwed <= 0) return false;
        const paymentDate = startOfDay(new Date(vendor.nextPaymentDate));
        // Overdue if payment date is before today
        return paymentDate < today;
      })
      .reduce((sum, vendor) => sum + vendor.nextPaymentAmount, 0);
  };

  // Calculate Net Amount for future dates (projected balance)
  const getNetAmountForFutureDate = (date: Date) => {
    const checkDate = startOfDay(new Date(date));
    const today = startOfDay(new Date());
    
    // Only calculate for future dates
    if (checkDate <= today) return null;

    // Start with current bank balance
    let netAmount = bankAccountBalance;

    // Add ALL pending/overdue income (not yet received)
    incomeItems.forEach(income => {
      if (income.status === 'received') return;
      const incomeDate = startOfDay(new Date(income.paymentDate));
      // Include if it's today, overdue, or future up to target date
      if (incomeDate <= checkDate) {
        netAmount += income.amount;
      }
    });

    // Add recurring income events up to target date
    events.forEach(event => {
      if (!event.id.startsWith('recurring-')) return;
      if (event.type !== 'inflow') return;
      const eventDate = startOfDay(new Date(event.date));
      if (eventDate <= checkDate) {
        netAmount += event.amount;
      }
    });

    // Subtract ALL pending/overdue vendor payments (not yet paid)
    vendors.forEach(vendor => {
      if (vendor.status === 'paid' || vendor.totalOwed <= 0) return;
      const paymentDate = startOfDay(new Date(vendor.nextPaymentDate));
      // Include if it's today, overdue, or future up to target date
      if (paymentDate <= checkDate) {
        netAmount -= vendor.nextPaymentAmount;
      }
    });

    // Subtract recurring expense events up to target date
    events.forEach(event => {
      if (!event.id.startsWith('recurring-')) return;
      if (event.type !== 'outflow') return;
      const eventDate = startOfDay(new Date(event.date));
      if (eventDate <= checkDate) {
        netAmount -= event.amount;
      }
    });

  // Add all other events (excluding ones already counted via incomeItems/vendors/recurring)
  events.forEach(event => {
    const eventDate = startOfDay(new Date(event.date));
    if (eventDate > today && eventDate <= checkDate) {
      // Skip recurring events (already counted above)
      if (event.id.startsWith('recurring-')) return;
      // Skip income events; handled by incomeItems
      if (event.type === 'inflow') return;
      // Skip vendor-related events; handled by vendors list
      if (event.type === 'purchase-order' || !!event.vendor) return;
      // Count remaining event types (e.g., credit payments, manual outflows)
      const delta = (event.type === 'outflow' || event.type === 'credit-payment') ? -event.amount : event.amount;
      netAmount += delta;
    }
  });

    return netAmount;
  };

  const getTotalCashForDay = (date: Date) => {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    // Calculate cumulative net change from all events up to and including target day
    const eventsUpToDay = events.filter((event) => {
      const ed = new Date(event.date);
      ed.setHours(0, 0, 0, 0);
      return ed <= target;
    });

    const netChange = eventsUpToDay.reduce(
      (total, event) => total + (event.type === 'inflow' ? event.amount : -event.amount),
      0
    );

    // Start with bank account balance (or totalCash baseline) and apply net change from transactions
    return bankAccountBalance + netChange;
  };

  const getEventIcon = (event: CashFlowEvent) => {
    if (event.source === 'Amazon-Forecasted') return <ShoppingBag className="h-3 w-3 text-purple-600" />;
    if (event.source === 'Amazon') return <ShoppingBag className="h-3 w-3" />;
    if (event.type === 'credit-payment') return <CreditCard className="h-3 w-3" />;
    if (event.type === 'purchase-order' || event.vendor) return <Building2 className="h-3 w-3" />;
    return <Wallet className="h-3 w-3" />;
  };

  const getEventColor = (event: CashFlowEvent) => {
    // Forecasted Amazon payouts get special purple/dashed styling
    if (event.source === 'Amazon-Forecasted' && event.type === 'inflow') {
      return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700/30 border-dashed';
    }
    // Amazon payouts get special orange color
    if (event.source === 'Amazon' && event.type === 'inflow') {
      return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700/30';
    }
    if (event.type === 'inflow') {
      return 'bg-finance-positive/20 text-finance-positive border-finance-positive/30';
    }
    if (event.type === 'credit-payment') {
      return 'bg-warning/20 text-warning-foreground border-warning/30';
    }
    if (event.type === 'purchase-order') {
      return 'bg-primary/20 text-primary border-primary/30';
    }
    return 'bg-finance-negative/20 text-finance-negative border-finance-negative/30';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const handleDragStart = (e: React.DragEvent, transaction: CashFlowEvent) => {
    e.stopPropagation();
    setDraggedTransaction(transaction);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTransaction || !onUpdateTransactionDate) {
      setDraggedTransaction(null);
      return;
    }

    // Determine if it's a vendor transaction or income transaction
    const eventType = draggedTransaction.type === 'purchase-order' || draggedTransaction.vendor ? 'vendor' : 'income';
    
    try {
      await onUpdateTransactionDate(draggedTransaction.id, targetDate, eventType);
      toast.success("Transaction date updated successfully");
    } catch (error) {
      console.error('Error updating transaction date:', error);
      toast.error("Failed to update transaction date");
    }
    
    setDraggedTransaction(null);
  };

  // Generate chart data based on selected time range
  const generateChartData = () => {
    const accountStartDate = new Date('2025-09-29');
    accountStartDate.setHours(0, 0, 0, 0);
    
    // Calculate date range based on selected time range (starting from today)
    const monthsToShow = parseInt(chartTimeRange);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chartStart = today; // Start from today
    const chartEnd = endOfMonth(addMonths(today, monthsToShow)); // End at the end of month X months from now
    
    const days = eachDayOfInterval({ start: chartStart, end: chartEnd });
    let runningTotal = totalAvailableCash;
    let cumulativeInflow = 0;
    let cumulativeOutflow = 0;
    
    return days.map(day => {
      const dayEvents = events.filter(event => 
        format(event.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      
      const dailyInflow = dayEvents.filter(e => e.type === 'inflow').reduce((sum, e) => sum + e.amount, 0);
      const dailyOutflow = dayEvents.filter(e => e.type !== 'inflow').reduce((sum, e) => sum + e.amount, 0);
      const dailyChange = dailyInflow - dailyOutflow;
      
      // Update running total from account start date onwards
      const dayToCheck = new Date(day);
      dayToCheck.setHours(0, 0, 0, 0);
      
      if (dayToCheck >= accountStartDate) {
        runningTotal += dailyChange;
        cumulativeInflow += dailyInflow;
        cumulativeOutflow += dailyOutflow;
      }
      
      // Check if this day has an Amazon payout
      const hasAmazonPayout = dayEvents.some(e => e.source === 'Amazon' && e.type === 'inflow');
      const hasAmazonForecast = dayEvents.some(e => e.source === 'Amazon-Forecasted' && e.type === 'inflow');
      
      // Calculate forecast payout amount
      const forecastPayoutAmount = dayEvents
        .filter(e => e.source === 'Amazon-Forecasted' && e.type === 'inflow')
        .reduce((sum, e) => sum + e.amount, 0);
      
      // Group events by type for detailed breakdown
      const inflowEvents = dayEvents.filter(e => e.type === 'inflow');
      const purchaseOrderEvents = dayEvents.filter(e => e.type === 'purchase-order');
      const creditPaymentEvents = dayEvents.filter(e => e.type === 'credit-payment');
      const outflowEvents = dayEvents.filter(e => e.type === 'outflow');
      
      // Calculate pending/overdue for this specific date
      const dayPendingIncome = incomeItems
        .filter(income => {
          if (income.status === 'received') return false;
          const incomeDate = startOfDay(new Date(income.paymentDate));
          return incomeDate <= dayToCheck && incomeDate >= today;
        })
        .reduce((sum, income) => sum + income.amount, 0);
      
      const dayOverdueIncome = incomeItems
        .filter(income => {
          if (income.status === 'received') return false;
          const incomeDate = startOfDay(new Date(income.paymentDate));
          return incomeDate < today;
        })
        .reduce((sum, income) => sum + income.amount, 0);

      const dayOverdueVendors = vendors
        .filter(vendor => {
          if (vendor.status === 'paid' || vendor.totalOwed <= 0) return false;
          const paymentDate = startOfDay(new Date(vendor.nextPaymentDate));
          return paymentDate < today;
        })
        .reduce((sum, vendor) => sum + vendor.nextPaymentAmount, 0);
      
      return {
        date: format(day, 'MMM dd'),
        fullDate: day,
        cashFlow: runningTotal,
        cashBalance: runningTotal,
        totalResources: runningTotal + totalAvailableCredit,
        availableCredit: runningTotal + totalAvailableCredit,
        creditCardBalance: totalAvailableCredit,
        creditCardCredit: totalAvailableCredit,
        reserve: reserveAmount,
        reserveAmount: reserveAmount,
        forecastPayout: forecastPayoutAmount,
        dailyChange,
        inflow: dailyInflow,
        outflow: dailyOutflow,
        cumulativeInflow,
        cumulativeOutflow,
        transactions: dayEvents,
        inflowEvents,
        purchaseOrderEvents,
        creditPaymentEvents,
        outflowEvents,
        pendingIncome: dayPendingIncome,
        overdueIncome: dayOverdueIncome,
        overdueVendors: dayOverdueVendors,
        hasAmazonPayout,
        hasAmazonForecast,
      };
    });
  };

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const dayData = data.activePayload[0].payload;
      const transactions = dayData.transactions || [];
      
      if (transactions.length === 1) {
        // Single transaction - show individual transaction modal
        setSelectedTransaction(transactions[0]);
        setShowTransactionModal(true);
      } else if (transactions.length > 1) {
        // Multiple transactions - show day transactions modal
        setSelectedDayTransactions(transactions);
        setSelectedDate(dayData.fullDate);
        setShowDayTransactionsModal(true);
      }
    }
  };

  const chartData = generateChartData();

  const chartConfig = {
    cashBalance: {
      label: "Cash Balance",
      color: cashFlowColor,
    },
    totalResources: {
      label: "Total Resources",
      color: totalResourcesColor,
    },
    creditCardBalance: {
      label: "Available Credit",
      color: creditCardColor,
    },
    reserveAmount: {
      label: "Reserve Amount",
      color: reserveColor,
    },
    forecastPayout: {
      label: "Forecast Payout",
      color: forecastColor,
    },
  };

  return (
    <Card className="shadow-card h-[700px] flex flex-col">
      <div className="relative flex-shrink-0">        
        <CardHeader className="pb-4 flex-shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-4">
                <CardTitle className="text-lg">Cash Flow Visualization</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">Healthy</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
                    <Button
                      variant={viewType === 'calendar' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewType('calendar')}
                      className="px-3"
                    >
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Calendar
                    </Button>
                    <Button
                      variant={viewType === 'chart' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewType('chart')}
                      className="px-3"
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Chart
                    </Button>
                  </div>
                  
                  {viewType === 'chart' && (
                    <>
                      <Select value={chartTimeRange} onValueChange={(value: '1' | '3' | '6' | '12') => setChartTimeRange(value)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Month</SelectItem>
                          <SelectItem value="3">3 Months</SelectItem>
                          <SelectItem value="6">6 Months</SelectItem>
                          <SelectItem value="12">1 Year</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={chartType} onValueChange={(value: 'bar' | 'line') => setChartType(value)}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Bar Chart</SelectItem>
                          <SelectItem value="line">Line Chart</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <PendingNotificationsPanel
                  vendors={vendors}
                  incomeItems={incomeItems}
                  onVendorClick={onVendorClick}
                  onIncomeClick={onIncomeClick}
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </div>
      
      {viewType === 'calendar' && (
        <div className="flex items-center justify-center px-6 pb-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-xl font-semibold min-w-[200px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <CardContent className="p-6">
        <div className="flex flex-col">
          {viewType === 'calendar' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Financial Summary Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Cash Balance</span>
                  </div>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">
                    ${bankAccountBalance.toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Available Credit</span>
                  </div>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    ${totalAvailableCredit.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Total Resources</span>
                  </div>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                    ${(bankAccountBalance + totalAvailableCredit).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2 flex-shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-1">
                  {day}
                </div>
              ))}
            </div>
        
            <div className={cn("grid grid-cols-7 gap-1 mb-4", gridRowsClass)}>
              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const dayBalance = getDayBalance(day);
                const totalCash = getTotalCashForDay(day);
                const pendingIncome = getPendingIncomeForToday(day);
                const overdueIncome = getOverdueIncomeForToday(day);
                const overdueVendors = getOverdueVendorsForToday(day);
                const netAmount = getNetAmountForFutureDate(day);
                const hasEvents = dayEvents.length > 0;
                const hasAmazonPayout = dayEvents.some(e => e.source === 'Amazon');
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dayToCheck = new Date(day);
                dayToCheck.setHours(0, 0, 0, 0);
                const isPast = dayToCheck < today;
                
                return (
                  <div
                    key={day.toISOString()}
                     className={cn(
                       "p-1 border rounded-md relative flex flex-col text-xs transition-all",
                       cellHeightClass,
                       {
                         // Amazon payout days - special orange/amber highlight
                         "bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-700": hasAmazonPayout && !isPast && !isToday(day) && isSameMonth(day, currentDate),
                         // Past days - grayed out
                         "opacity-50 text-muted-foreground bg-muted/30": isPast && isSameMonth(day, currentDate),
                         // Today - highlighted with primary color and border
                         "ring-2 ring-primary bg-primary/10 border-primary/50 font-semibold": isToday(day),
                         // Low cash warning
                         "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800": totalCash < 0 && !hasAmazonPayout,
                         // Outside month
                         "opacity-30 bg-background": !isSameMonth(day, currentDate),
                         // Normal days
                         "bg-background hover:bg-muted/30": !isPast && !isToday(day) && isSameMonth(day, currentDate) && totalCash >= 0 && !hasAmazonPayout,
                         // Days with events
                         "border-primary/30": hasEvents && !hasAmazonPayout,
                         "border-border": !hasEvents && !hasAmazonPayout,
                         // Drag and drop styling
                         "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20": draggedTransaction && !isPast
                       }
                     )}
                     onDragOver={!isPast ? handleDragOver : undefined}
                     onDrop={!isPast ? (e) => handleDrop(e, day) : undefined}
                   >
                    {/* Day header with number on left, Cash/Credit on right */}
                    <div className="mb-0.5">
                       <div className="flex items-start justify-between gap-1">
                        <div className="text-sm font-bold text-foreground">
                          {format(day, 'd')}
                        </div>
                        <div className="flex flex-col items-end text-right gap-0.5 flex-1 min-w-0">
                          {/* Show financial info on all dates from account start onwards */}
                          {hasAnyData && isSameMonth(day, currentDate) && (
                            <>
                              {isToday(day) ? (
                                <>
                                  {/* TODAY: Cash, Pending (income), Credit */}
                                  <div className="text-[10px] text-green-600 dark:text-green-400 font-medium w-full">
                                    Cash: ${bankAccountBalance.toLocaleString()}
                                  </div>
                                  {(() => {
                                    const pendingIncome = getPendingIncomeForToday(day);
                                    if (pendingIncome > 0) {
                                      return (
                                        <div className="text-[10px] text-orange-600 dark:text-orange-400 font-medium w-full">
                                          Pending: ${pendingIncome.toLocaleString()}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium w-full">
                                    Credit: ${totalAvailableCredit.toLocaleString()}
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* FUTURE: Total Projected Cash, Credit */}
                                  <div className="w-full">
                                    <div className="text-[9px] text-green-600 dark:text-green-400 font-medium">
                                      Total Projected Cash
                                    </div>
                                    <div className="text-[11px] text-green-700 dark:text-green-300 font-bold">
                                      ${getTotalCashForDay(day).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium w-full">
                                    Credit: ${totalAvailableCredit.toLocaleString()}
                                  </div>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {totalCash < 0 && (
                        <AlertTriangle className="h-3 w-3 text-red-500 absolute top-1 right-1" />
                      )}
                    </div>

                    {/* Compact financial info - stacked vertically below */}
                    {hasAnyData && (
                      <div className="space-y-0 text-[10px] leading-tight">
                        {/* Overdue - show on current day and past dates */}
                        {(isToday(day) || isPast) && overdueVendors > 0 && (
                          <div className="text-red-600 dark:text-red-400 font-medium truncate">
                            Overdue - ${overdueVendors.toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Single transaction display - draggable and clickable */}
                    {hasEvents && dayEvents.length === 1 && (
                      <div 
                        className="mt-1 pt-0.5 border-t border-border/30 cursor-pointer"
                        draggable={!isPast && onUpdateTransactionDate !== undefined}
                        onDragStart={(e) => !isPast && onUpdateTransactionDate ? handleDragStart(e, dayEvents[0]) : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTransaction(dayEvents[0]);
                          setShowTransactionModal(true);
                        }}
                      >
                        <div className="text-[9px] truncate leading-tight">
                          <span className="text-foreground font-medium">
                            {/* Show "Recurring" for recurring transactions, vendor/description for others */}
                            {dayEvents[0].id.startsWith('recurring-')
                              ? 'Recurring'
                              : isToday(day) && dayEvents[0].vendor 
                                ? dayEvents[0].vendor 
                                : dayEvents[0].type === 'inflow' 
                                  ? dayEvents[0].description 
                                  : (dayEvents[0].vendor || dayEvents[0].description)}
                          </span>
                          <span className={`ml-1 ${dayEvents[0].type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                            {dayEvents[0].type === 'inflow' ? '+' : '-'}${dayEvents[0].amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Transactions link at bottom - only show for multiple transactions */}
                    {hasEvents && dayEvents.length > 1 && (
                      <div className="mt-auto pt-0.5 border-t border-border/30">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayTransactions(dayEvents);
                            setSelectedDate(day);
                            setShowDayTransactionsModal(true);
                          }}
                          className="text-[9px] text-primary hover:underline font-medium w-full text-left"
                        >
                          Transactions ({dayEvents.length})
                        </button>
                      </div>
                    )}
                   </div>
                 );
                })}
                </div>
             </div>
          ) : (
            <div className="w-full" style={{ height: '500px' }}>
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={chartData} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <ChartTooltip 
                        content={
                          <ChartTooltipContent 
                            formatter={(value: number, name: string) => {
                              const labels: Record<string, string> = {
                                totalResources: "Total Resources:",
                                cashBalance: "Cash Flow:",
                                creditCardBalance: "Available Credit:",
                                reserveAmount: "Reserve Amount:",
                                forecastPayout: "Forecast Payout:"
                              };
                              return [labels[name] || name, `$${value.toLocaleString()}`];
                            }}
                            itemSorter={(item) => {
                              const order = ["totalResources", "cashBalance", "creditCardBalance", "reserveAmount", "forecastPayout"];
                              return order.indexOf(item.dataKey as string);
                            }}
                          />
                        }
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            const data = payload[0].payload;
                            const hasTransactions = data.transactions && data.transactions.length > 0;
                            return (
                              <div className="space-y-2 min-w-[280px]">
                                <p className="font-semibold text-base border-b pb-2">{label}</p>
                                
                                {/* Balance Section */}
                                <div className="space-y-1">
                                  <p className="font-bold text-base">
                                    Projected Balance: <span className="text-primary">${data.cashFlow.toLocaleString()}</span>
                                  </p>
                                  {data.dailyChange !== 0 && (
                                    <p className={`font-medium ${data.dailyChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      Daily Net: {data.dailyChange > 0 ? '+' : ''}${Math.abs(data.dailyChange).toLocaleString()}
                                    </p>
                                  )}
                                </div>

                                {/* Daily Transactions */}
                                {hasTransactions && (
                                  <div className="space-y-1.5 border-t pt-2">
                                    <p className="font-semibold text-xs uppercase text-muted-foreground">Daily Activity</p>
                                    {data.inflow > 0 && (
                                      <div>
                                        <p className="text-green-600 font-medium">↑ Inflows: +${data.inflow.toLocaleString()}</p>
                                        {data.inflowEvents?.map((evt: CashFlowEvent, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground ml-3">• {evt.description}: ${evt.amount.toLocaleString()}</p>
                                        ))}
                                      </div>
                                    )}
                                    {data.outflow > 0 && (
                                      <div>
                                        <p className="text-red-600 font-medium">↓ Outflows: -${data.outflow.toLocaleString()}</p>
                                        {data.purchaseOrderEvents?.map((evt: CashFlowEvent, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground ml-3">• {evt.description}: ${evt.amount.toLocaleString()}</p>
                                        ))}
                                        {data.creditPaymentEvents?.map((evt: CashFlowEvent, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground ml-3">• {evt.description}: ${evt.amount.toLocaleString()}</p>
                                        ))}
                                        {data.outflowEvents?.map((evt: CashFlowEvent, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground ml-3">• {evt.description}: ${evt.amount.toLocaleString()}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Cumulative Totals */}
                                {(data.cumulativeInflow > 0 || data.cumulativeOutflow > 0) && (
                                  <div className="space-y-1 border-t pt-2">
                                    <p className="font-semibold text-xs uppercase text-muted-foreground">Period Totals</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <p className="text-muted-foreground">Total Inflows:</p>
                                        <p className="font-semibold text-green-600">${data.cumulativeInflow.toLocaleString()}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Total Outflows:</p>
                                        <p className="font-semibold text-red-600">${data.cumulativeOutflow.toLocaleString()}</p>
                                      </div>
                                    </div>
                                    <p className="text-xs font-medium pt-1">
                                      Net: <span className={data.cumulativeInflow - data.cumulativeOutflow > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {data.cumulativeInflow - data.cumulativeOutflow > 0 ? '+' : ''}${(data.cumulativeInflow - data.cumulativeOutflow).toLocaleString()}
                                      </span>
                                    </p>
                                  </div>
                                )}

                                {hasTransactions && (
                                  <p className="text-primary text-xs font-medium pt-1 border-t">
                                    💡 Click to view full transaction details
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return label;
                        }}
                      />
                      <Bar 
                        dataKey="cashFlow" 
                        fill={cashFlowColor}
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                      />
                      {showTotalResourcesLine && (
                        <Line
                          type="monotone"
                          dataKey="availableCredit"
                          stroke={totalResourcesColor}
                          strokeWidth={2}
                          dot={false}
                        />
                      )}
                      {showCreditCardLine && (
                        <Line
                          type="monotone"
                          dataKey="creditCardCredit"
                          stroke={creditCardColor}
                          strokeWidth={2}
                          dot={false}
                        />
                      )}
                      {showReserveLine && (
                        <Line
                          type="monotone"
                          dataKey="reserve"
                          stroke={reserveColor}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      )}
                    </BarChart>
                  ) : (
                    <LineChart data={chartData} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <ChartTooltip 
                        content={
                          <ChartTooltipContent 
                            formatter={(value: number, name: string) => {
                              const labels: Record<string, string> = {
                                totalResources: "Total Resources:",
                                cashBalance: "Cash Flow:",
                                creditCardBalance: "Available Credit:",
                                reserveAmount: "Reserve Amount:",
                                forecastPayout: "Forecast Payout:"
                              };
                              return [labels[name] || name, `$${value.toLocaleString()}`];
                            }}
                            itemSorter={(item) => {
                              const order = ["totalResources", "cashBalance", "creditCardBalance", "reserveAmount", "forecastPayout"];
                              return order.indexOf(item.dataKey as string);
                            }}
                          />
                        }
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            const data = payload[0].payload;
                            const hasTransactions = data.transactions && data.transactions.length > 0;
                            const hasAmazonPayout = data.hasAmazonPayout;
                            const hasAmazonForecast = data.hasAmazonForecast;
                            return (
                              <div className="space-y-2 min-w-[300px]">
                                <p className="font-semibold text-base border-b pb-2">{label}</p>
                                
                                {/* Amazon Payout Indicators */}
                                {hasAmazonPayout && (
                                  <p className="text-orange-600 font-medium flex items-center gap-1">
                                    <ShoppingBag className="h-3 w-3" />
                                    Amazon Payout
                                  </p>
                                )}
                                {hasAmazonForecast && (
                                  <p className="text-purple-600 font-medium flex items-center gap-1">
                                    <ShoppingBag className="h-3 w-3" />
                                    Amazon Payout (Forecasted)
                                  </p>
                                )}
                                
                                {/* Balance Section */}
                                <div className="space-y-1">
                                  <p className="font-bold text-base">
                                    Projected Balance: <span className="text-primary">${data.cashFlow.toLocaleString()}</span>
                                  </p>
                                  {data.dailyChange !== 0 && (
                                    <p className={`font-medium ${data.dailyChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      Daily Net: {data.dailyChange > 0 ? '+' : ''}${Math.abs(data.dailyChange).toLocaleString()}
                                    </p>
                                  )}
                                </div>

                                {/* Daily Transactions */}
                                {hasTransactions && (
                                  <div className="space-y-1.5 border-t pt-2">
                                    <p className="font-semibold text-xs uppercase text-muted-foreground">Daily Activity</p>
                                    {data.inflow > 0 && (
                                      <div>
                                        <p className="text-green-600 font-medium">↑ Inflows: +${data.inflow.toLocaleString()}</p>
                                        {data.inflowEvents?.map((evt: CashFlowEvent, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground ml-3">• {evt.description}: ${evt.amount.toLocaleString()}</p>
                                        ))}
                                      </div>
                                    )}
                                    {data.outflow > 0 && (
                                      <div>
                                        <p className="text-red-600 font-medium">↓ Outflows: -${data.outflow.toLocaleString()}</p>
                                        {data.purchaseOrderEvents?.map((evt: CashFlowEvent, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground ml-3">• {evt.description}: ${evt.amount.toLocaleString()}</p>
                                        ))}
                                        {data.creditPaymentEvents?.map((evt: CashFlowEvent, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground ml-3">• {evt.description}: ${evt.amount.toLocaleString()}</p>
                                        ))}
                                        {data.outflowEvents?.map((evt: CashFlowEvent, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground ml-3">• {evt.description}: ${evt.amount.toLocaleString()}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Pending/Overdue Items */}
                                {(data.pendingIncome > 0 || data.overdueIncome > 0 || data.overdueVendors > 0) && (
                                  <div className="space-y-1 border-t pt-2">
                                    <p className="font-semibold text-xs uppercase text-muted-foreground">Outstanding Items</p>
                                    {data.overdueIncome > 0 && (
                                      <p className="text-xs text-red-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Overdue Income: ${data.overdueIncome.toLocaleString()}
                                      </p>
                                    )}
                                    {data.overdueVendors > 0 && (
                                      <p className="text-xs text-red-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Overdue Vendors: ${data.overdueVendors.toLocaleString()}
                                      </p>
                                    )}
                                    {data.pendingIncome > 0 && (
                                      <p className="text-xs text-yellow-600">
                                        Pending Income: ${data.pendingIncome.toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Cumulative Totals */}
                                {(data.cumulativeInflow > 0 || data.cumulativeOutflow > 0) && (
                                  <div className="space-y-1 border-t pt-2">
                                    <p className="font-semibold text-xs uppercase text-muted-foreground">Period Totals</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <p className="text-muted-foreground">Total Inflows:</p>
                                        <p className="font-semibold text-green-600">${data.cumulativeInflow.toLocaleString()}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Total Outflows:</p>
                                        <p className="font-semibold text-red-600">${data.cumulativeOutflow.toLocaleString()}</p>
                                      </div>
                                    </div>
                                    <p className="text-xs font-medium pt-1">
                                      Net: <span className={data.cumulativeInflow - data.cumulativeOutflow > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {data.cumulativeInflow - data.cumulativeOutflow > 0 ? '+' : ''}${(data.cumulativeInflow - data.cumulativeOutflow).toLocaleString()}
                                      </span>
                                    </p>
                                  </div>
                                )}

                                {hasTransactions && (
                                  <p className="text-primary text-xs font-medium pt-1 border-t">
                                    💡 Click to view full transaction details
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return label;
                        }}
                      />
                      {showCashFlowLine && (
                        <Line 
                          type="monotone" 
                          dataKey="cashBalance" 
                          stroke={cashFlowColor.startsWith('hsl') ? '#3b82f6' : cashFlowColor}
                          strokeWidth={2}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            
                            // Only show dot if there are transactions on this date
                            if (!payload.transactions || payload.transactions.length === 0) {
                              return null;
                            }
                            
                            if (payload.hasAmazonForecast) {
                              // Forecasted payout - purple/dashed
                              return (
                                <g>
                                  <circle cx={cx} cy={cy} r={6} fill="#a855f7" stroke="#9333ea" strokeWidth={2} strokeDasharray="3,3" />
                                  <circle cx={cx} cy={cy} r={3} fill="#fff" />
                                </g>
                              );
                            }
                            if (payload.hasAmazonPayout) {
                              // Confirmed payout - orange
                              return (
                                <g>
                                  <circle cx={cx} cy={cy} r={6} fill="#f97316" stroke="#ea580c" strokeWidth={2} />
                                  <circle cx={cx} cy={cy} r={3} fill="#fff" />
                                </g>
                              );
                            }
                            const fillColor = cashFlowColor.startsWith('hsl') ? '#3b82f6' : cashFlowColor;
                            return <circle cx={cx} cy={cy} r={4} fill={fillColor} cursor="pointer" />;
                          }}
                          activeDot={{ r: 6, cursor: 'pointer' }}
                        />
                      )}
                      {showTotalResourcesLine && (
                        <Line
                          type="monotone"
                          dataKey="totalResources"
                          stroke={totalResourcesColor}
                          strokeWidth={2}
                          dot={false}
                        />
                      )}
                      {showCreditCardLine && (
                        <Line
                          type="monotone"
                          dataKey="creditCardBalance"
                          stroke={creditCardColor}
                          strokeWidth={2}
                          dot={false}
                        />
                      )}
                      {showReserveLine && (
                        <Line
                          type="monotone"
                          dataKey="reserveAmount"
                          stroke={reserveColor}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      )}
                      {showForecastLine && (
                        <Line
                          type="monotone"
                          dataKey="forecastPayout"
                          stroke={forecastColor}
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            if (!payload.forecastPayout || payload.forecastPayout === 0) {
                              return null;
                            }
                            return (
                              <g>
                                <circle cx={cx} cy={cy} r={6} fill={forecastColor} stroke="#9333ea" strokeWidth={2} />
                                <circle cx={cx} cy={cy} r={3} fill="#fff" />
                              </g>
                            );
                          }}
                        />
                      )}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}
          
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t flex-shrink-0">
            {viewType === 'chart' ? (
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="resources-toggle"
                    checked={showTotalResourcesLine}
                    onChange={(e) => {
                      setShowTotalResourcesLine(e.target.checked);
                      updateChartPreferences({ showTotalResourcesLine: e.target.checked });
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="resources-color" className="cursor-pointer">
                    <input
                      type="color"
                      id="resources-color"
                      value={totalResourcesColor}
                      onChange={(e) => {
                        setTotalResourcesColor(e.target.value);
                        updateChartPreferences({ totalResourcesColor: e.target.value });
                      }}
                      className="w-3 h-3 rounded cursor-pointer border-0 p-0"
                      style={{ appearance: 'none', backgroundColor: totalResourcesColor }}
                    />
                  </label>
                  <label htmlFor="resources-toggle" className="cursor-pointer">Total Resources (Cash + Credit)</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cashflow-toggle"
                    checked={showCashFlowLine}
                    onChange={(e) => {
                      setShowCashFlowLine(e.target.checked);
                      updateChartPreferences({ showCashFlowLine: e.target.checked });
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="cashflow-color" className="cursor-pointer">
                    <input
                      type="color"
                      id="cashflow-color"
                      value={cashFlowColor.startsWith('hsl') ? '#3b82f6' : cashFlowColor}
                      onChange={(e) => {
                        setCashFlowColor(e.target.value);
                        updateChartPreferences({ cashFlowColor: e.target.value });
                      }}
                      className="w-3 h-3 rounded cursor-pointer border-0 p-0"
                      style={{ appearance: 'none', backgroundColor: cashFlowColor.startsWith('hsl') ? '#3b82f6' : cashFlowColor }}
                    />
                  </label>
                  <label htmlFor="cashflow-toggle" className="cursor-pointer">Cash Balance</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="credit-toggle"
                    checked={showCreditCardLine}
                    onChange={(e) => {
                      setShowCreditCardLine(e.target.checked);
                      updateChartPreferences({ showCreditCardLine: e.target.checked });
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="credit-color" className="cursor-pointer">
                    <input
                      type="color"
                      id="credit-color"
                      value={creditCardColor}
                      onChange={(e) => {
                        setCreditCardColor(e.target.value);
                        updateChartPreferences({ creditCardColor: e.target.value });
                      }}
                      className="w-3 h-3 rounded cursor-pointer border-0 p-0"
                      style={{ appearance: 'none', backgroundColor: creditCardColor }}
                    />
                  </label>
                  <label htmlFor="credit-toggle" className="cursor-pointer">Available Credit</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="reserve-toggle"
                    checked={showReserveLine}
                    onChange={(e) => {
                      setShowReserveLine(e.target.checked);
                      updateChartPreferences({ showReserveLine: e.target.checked });
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="reserve-color" className="cursor-pointer">
                    <input
                      type="color"
                      id="reserve-color"
                      value={reserveColor}
                      onChange={(e) => {
                        setReserveColor(e.target.value);
                        updateChartPreferences({ reserveColor: e.target.value });
                      }}
                      className="w-3 h-3 rounded cursor-pointer border-0 p-0"
                      style={{ appearance: 'none', backgroundColor: reserveColor }}
                    />
                  </label>
                  <label htmlFor="reserve-toggle" className="cursor-pointer">Reserve Amount</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="forecast-toggle"
                    checked={showForecastLine}
                    onChange={(e) => {
                      setShowForecastLine(e.target.checked);
                      updateChartPreferences({ showForecastLine: e.target.checked });
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="forecast-color" className="cursor-pointer">
                    <input
                      type="color"
                      id="forecast-color"
                      value={forecastColor}
                      onChange={(e) => {
                        setForecastColor(e.target.value);
                        updateChartPreferences({ forecastColor: e.target.value });
                      }}
                      className="w-3 h-3 rounded cursor-pointer border-0 p-0"
                      style={{ appearance: 'none', backgroundColor: forecastColor }}
                    />
                  </label>
                  <label htmlFor="forecast-toggle" className="cursor-pointer">Forecast Payout</label>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded bg-finance-positive"></div>
                  <span>Inflows</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded bg-finance-negative"></div>
                  <span>Outflows</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded bg-warning"></div>
                  <span>Credit Payments</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded bg-primary"></div>
                  <span>Purchase Orders</span>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </CardContent>
      
      <TransactionDetailModal
        transaction={selectedTransaction}
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
        onEdit={onEditTransaction}
      />
      
      <DayTransactionsModal
        transactions={selectedDayTransactions}
        date={selectedDate}
        open={showDayTransactionsModal}
        onOpenChange={setShowDayTransactionsModal}
      />
    </Card>
  );
};