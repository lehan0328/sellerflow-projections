import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Wallet, CreditCard, Building2, CalendarIcon, TrendingUp, ShoppingBag, AlertTriangle } from "lucide-react";
import { useCreditCards } from "@/hooks/useCreditCards";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, subDays, addDays, startOfWeek, endOfWeek, getDay, startOfDay } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
}: CashFlowCalendarProps) => {
  const { totalAvailableCredit } = useCreditCards();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'calendar' | 'chart'>('calendar');
  const [selectedTransaction, setSelectedTransaction] = useState<CashFlowEvent | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedDayTransactions, setSelectedDayTransactions] = useState<CashFlowEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayTransactionsModal, setShowDayTransactionsModal] = useState(false);
  const [draggedTransaction, setDraggedTransaction] = useState<CashFlowEvent | null>(null);
  
  // Total available cash baseline comes from Overview (displayCash)
  const totalAvailableCash = totalCash;
  
  // Account start date (inclusive)
  const accountStartDate = new Date('2025-09-29');
  accountStartDate.setHours(0, 0, 0, 0);
  
  // Filter events to only those on/after the account start date
  const events = propEvents.filter(e => {
    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);
    return d >= accountStartDate;
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

    return incomeItems
      .filter(income => {
        if (income.status === 'received') return false;
        const incomeDate = startOfDay(new Date(income.paymentDate));
        // Only show pending if due date is today or earlier (past/current, not future)
        return incomeDate <= today;
      })
      .reduce((sum, income) => sum + income.amount, 0);
  };

  // Get overdue income - only show on TODAY
  const getOverdueIncomeForToday = (date: Date) => {
    const checkDate = startOfDay(new Date(date));
    const today = startOfDay(new Date());
    
    // Only show overdue on today
    if (checkDate.getTime() !== today.getTime()) return 0;

    return incomeItems
      .filter(income => {
        if (income.status === 'received') return false;
        const incomeDate = startOfDay(new Date(income.paymentDate));
        // Overdue if payment date is before today
        return incomeDate < today;
      })
      .reduce((sum, income) => sum + income.amount, 0);
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

    // Subtract ALL pending/overdue vendor payments (not yet paid)
    vendors.forEach(vendor => {
      if (vendor.status === 'paid' || vendor.totalOwed <= 0) return;
      const paymentDate = startOfDay(new Date(vendor.nextPaymentDate));
      // Include if it's today, overdue, or future up to target date
      if (paymentDate <= checkDate) {
        netAmount -= vendor.nextPaymentAmount;
      }
    });

  // Add all other events (excluding ones already counted via incomeItems/vendors)
  events.forEach(event => {
    const eventDate = startOfDay(new Date(event.date));
    if (eventDate > today && eventDate <= checkDate) {
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
    if (event.source === 'amazon') return <ShoppingBag className="h-3 w-3" />;
    if (event.type === 'credit-payment') return <CreditCard className="h-3 w-3" />;
    if (event.type === 'purchase-order' || event.vendor) return <Building2 className="h-3 w-3" />;
    return <Wallet className="h-3 w-3" />;
  };

  const getEventColor = (event: CashFlowEvent) => {
    // Amazon payouts get special orange color
    if (event.source === 'amazon' && event.type === 'inflow') {
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

  // Generate chart data for current month
  const generateChartData = () => {
    const accountStartDate = new Date('2025-09-29');
    accountStartDate.setHours(0, 0, 0, 0);
    
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    let runningTotal = totalAvailableCash;
    
    return days.map(day => {
      const dayEvents = events.filter(event => 
        format(event.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      
      const dailyChange = dayEvents.reduce((total, event) => {
        return total + (event.type === 'inflow' ? event.amount : -event.amount);
      }, 0);
      
      // Update running total from account start date onwards
      const dayToCheck = new Date(day);
      dayToCheck.setHours(0, 0, 0, 0);
      
      if (dayToCheck >= accountStartDate) {
        runningTotal += dailyChange;
      }
      
      return {
        date: format(day, 'MMM dd'),
        fullDate: day,
        cashFlow: runningTotal,
        dailyChange,
        inflow: dayEvents.filter(e => e.type === 'inflow').reduce((sum, e) => sum + e.amount, 0),
        outflow: dayEvents.filter(e => e.type !== 'inflow').reduce((sum, e) => sum + e.amount, 0),
        transactions: dayEvents,
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
    cashFlow: {
      label: "Cash Flow",
      color: "hsl(var(--primary))",
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
              </div>
              
              <PendingNotificationsPanel
                vendors={vendors}
                incomeItems={incomeItems}
                onVendorClick={onVendorClick}
                onIncomeClick={onIncomeClick}
              />
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
      
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {viewType === 'calendar' ? (
            <div className="flex-1 min-h-0 flex flex-col">
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
                         // Past days - grayed out
                         "opacity-50 text-muted-foreground bg-muted/30": isPast && isSameMonth(day, currentDate),
                         // Today - highlighted with primary color and border
                         "ring-2 ring-primary bg-primary/10 border-primary/50 font-semibold": isToday(day),
                         // Low cash warning
                         "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800": totalCash < 0,
                         // Outside month
                         "opacity-30 bg-background": !isSameMonth(day, currentDate),
                         // Normal days
                         "bg-background hover:bg-muted/30": !isPast && !isToday(day) && isSameMonth(day, currentDate) && totalCash >= 0,
                         // Days with events
                         "border-primary/30": hasEvents,
                         "border-border": !hasEvents,
                         // Drag and drop styling
                         "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20": draggedTransaction && !isPast
                       }
                     )}
                     onDragOver={!isPast ? handleDragOver : undefined}
                     onDrop={!isPast ? (e) => handleDrop(e, day) : undefined}
                   >
                    {/* Day header with number on left, Cash/Credit on right */}
                    <div className="mb-0.5">
                      <div className="flex items-start justify-between">
                        <div className="text-sm font-bold text-foreground">
                          {format(day, 'd')}
                        </div>
                        <div className="flex flex-col items-end text-right">
                          {/* Cash - only show on current day */}
                          {hasAnyData && isToday(day) && (
                            <div className="text-[10px] text-green-600 dark:text-green-400 font-medium truncate">
                              Cash ${bankAccountBalance.toLocaleString()}
                            </div>
                          )}
                          {/* Credit - only show on current day */}
                          {hasAnyData && isToday(day) && (
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate">
                              Credit ${totalAvailableCredit.toLocaleString()}
                            </div>
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
                        {/* Pending - only show on current day */}
                        {isToday(day) && pendingIncome > 0 && (
                          <div className="text-orange-600 dark:text-orange-400 font-medium truncate">
                            Pending +${pendingIncome.toLocaleString()}
                          </div>
                        )}
                        
                        {/* Overdue - show on current day and past dates */}
                        {(isToday(day) || isPast) && (overdueIncome > 0 || overdueVendors > 0) && (
                          <div className="text-red-600 dark:text-red-400 font-medium truncate">
                            Overdue {overdueIncome >= overdueVendors ? '+' : '-'}${Math.abs(overdueIncome - overdueVendors).toLocaleString()}
                          </div>
                        )}

                        {/* Net Amount for future dates */}
                        {!isToday(day) && !isPast && netAmount !== null && (
                          <div className={`font-medium truncate ${netAmount < 0 ? 'text-red-600' : 'text-green-600 dark:text-green-400'}`}>
                            Net ${netAmount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Transactions link at bottom - always visible if there are events */}
                    {hasEvents && (
                      <div className="mt-auto pt-0.5 border-t border-border/30">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (dayEvents.length === 1) {
                              setSelectedTransaction(dayEvents[0]);
                              setShowTransactionModal(true);
                            } else {
                              setSelectedDayTransactions(dayEvents);
                              setSelectedDate(day);
                              setShowDayTransactionsModal(true);
                            }
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
            <div className="h-[400px] flex-shrink-0">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
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
                      content={<ChartTooltipContent />}
                      formatter={(value: number, name: string) => [
                        `$${value.toLocaleString()}`,
                        'Cash Flow'
                      ]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          const data = payload[0].payload;
                          const hasTransactions = data.transactions && data.transactions.length > 0;
                          return (
                            <div className="space-y-1">
                              <p className="font-semibold">{label}</p>
                              <div className="text-sm space-y-1">
                                {data.dailyChange !== 0 && (
                                  <p className={data.dailyChange > 0 ? 'text-green-600' : 'text-red-600'}>
                                    Daily Change: ${data.dailyChange > 0 ? '+' : ''}${data.dailyChange.toLocaleString()}
                                  </p>
                                )}
                                {data.inflow > 0 && (
                                  <p className="text-green-600">Inflow: +${data.inflow.toLocaleString()}</p>
                                )}
                                {data.outflow > 0 && (
                                  <p className="text-red-600">Outflow: -${data.outflow.toLocaleString()}</p>
                                )}
                                {hasTransactions && (
                                  <p className="text-blue-600 font-medium">
                                    💡 Click to view transaction details
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return label;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cashFlow" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ r: 4, cursor: 'pointer' }}
                      activeDot={{ r: 6, cursor: 'pointer' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}
          
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t flex-shrink-0">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-finance-positive"></div>
                <span>Inflows</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-finance-negative"></div>
                <span>Outflows</span>
              </div>
              {viewType === 'calendar' && (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded bg-warning"></div>
                    <span>Credit Payments</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded bg-primary"></div>
                    <span>Purchase Orders</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              {viewType === 'calendar' ? 'Monthly Net:' : 'Period Net:'} <span className="font-semibold text-foreground">
                {(() => {
                  // Calculate cumulative balance through end of displayed month
                  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                  endOfMonth.setHours(23, 59, 59, 999);
                  
                  const cumulativeNet = events
                    .filter(event => {
                      const eventDate = new Date(event.date);
                      return eventDate <= endOfMonth;
                    })
                    .reduce((sum, event) => 
                      sum + (event.type === 'inflow' ? event.amount : -event.amount), 0
                    );
                  return `${cumulativeNet >= 0 ? '+' : ''}$${cumulativeNet.toLocaleString()}`;
                })()}
              </span>
            </div>
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