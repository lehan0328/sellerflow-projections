import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Wallet, CreditCard, Building2, CalendarIcon, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, subDays, addDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TransactionDetailModal } from "./transaction-detail-modal";
import { cn } from "@/lib/utils";

interface CashFlowEvent {
  id: string;
  type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
  amount: number;
  description: string;
  vendor?: string;
  creditCard?: string;
  poName?: string;
  date: Date;
}

interface CashFlowCalendarProps {
  events?: CashFlowEvent[];
}

export const CashFlowCalendar = ({ events: propEvents }: CashFlowCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'calendar' | 'chart'>('calendar');
  const [dateRangeOption, setDateRangeOption] = useState<'next30' | 'thisMonth' | 'nextMonth'>('next30');
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: addDays(new Date(), 30)
  });
  const [selectedTransaction, setSelectedTransaction] = useState<CashFlowEvent | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  
  // Total available cash (this would come from bank integrations)
  const totalAvailableCash = 145750;
  
  // Sample cash flow events (including credit card payments and purchase orders)
  const defaultEvents: CashFlowEvent[] = [
    {
      id: '1',
      type: 'inflow',
      amount: 25000,
      description: 'Amazon Payout',
      date: new Date(2024, 0, 15)
    },
    {
      id: '2',
      type: 'purchase-order',
      amount: 8500,
      description: 'Inventory Purchase',
      vendor: 'Global Vendor Co.',
      poName: 'Q1 Inventory Restock',
      date: new Date(2024, 0, 18)
    },
    {
      id: '3',
      type: 'inflow',
      amount: 28000,
      description: 'Amazon Payout',
      date: new Date(2024, 0, 30)
    },
    {
      id: '4',
      type: 'purchase-order',
      amount: 3200,
      description: 'PPC Campaign',
      vendor: 'Amazon Advertising',
      poName: 'January PPC Budget',
      date: new Date(2024, 0, 25)
    },
    {
      id: '5',
      type: 'credit-payment',
      amount: 2500,
      description: 'Chase Sapphire Payment Due',
      creditCard: 'Chase Sapphire Business',
      date: new Date(2024, 0, 22)
    },
    {
      id: '6',
      type: 'credit-payment',
      amount: 1800,
      description: 'American Express Payment Due',
      creditCard: 'Amex Gold Business',
      date: new Date(2024, 0, 28)
    },
    {
      id: '7',
      type: 'inflow',
      amount: 32000,
      description: 'Amazon Payout',
      date: new Date(2024, 1, 14)
    },
    {
      id: '8',
      type: 'purchase-order',
      amount: 12000,
      description: 'Inventory Restock',
      vendor: 'Inventory Plus LLC',
      poName: 'February Bulk Order',
      date: new Date(2024, 1, 5)
    }
  ];

  const events = propEvents || defaultEvents;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Use date range for calendar view when specific ranges are selected
  const calendarStart = dateRangeOption === 'next30' ? dateRange.start : monthStart;
  const calendarEnd = dateRangeOption === 'next30' ? dateRange.end : monthEnd;
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

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

  const getTotalCashForDay = (date: Date) => {
    // For today's date, always show the exact total available cash
    if (isToday(date)) {
      return totalAvailableCash;
    }
    
    // For other dates, calculate based on events
    const eventsUpToDate = events.filter(event => event.date <= date);
    const cumulativeChange = eventsUpToDate.reduce((total, event) => {
      return total + (event.type === 'inflow' ? event.amount : -event.amount);
    }, 0);
    return totalAvailableCash + cumulativeChange;
  };

  const getEventIcon = (event: CashFlowEvent) => {
    if (event.type === 'credit-payment') return <CreditCard className="h-3 w-3" />;
    if (event.type === 'purchase-order' || event.vendor) return <Building2 className="h-3 w-3" />;
    return <Wallet className="h-3 w-3" />;
  };

  const getEventColor = (event: CashFlowEvent) => {
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

  const handleDateRangeOptionChange = (option: 'next30' | 'thisMonth' | 'nextMonth') => {
    setDateRangeOption(option);
    const now = new Date();
    
    switch (option) {
      case 'next30':
        const next30Start = now;
        const next30End = addDays(now, 30);
        setDateRange({
          start: next30Start,
          end: next30End
        });
        // Update the calendar view to show the range
        setCurrentDate(next30Start);
        break;
      case 'thisMonth':
        const thisMonthStart = startOfMonth(now);
        const thisMonthEnd = endOfMonth(now);
        setDateRange({
          start: thisMonthStart,
          end: thisMonthEnd
        });
        setCurrentDate(now);
        break;
      case 'nextMonth':
        const nextMonth = addMonths(now, 1);
        const nextMonthStart = startOfMonth(nextMonth);
        const nextMonthEnd = endOfMonth(nextMonth);
        setDateRange({
          start: nextMonthStart,
          end: nextMonthEnd
        });
        setCurrentDate(nextMonth);
        break;
    }
  };

  // Generate chart data for line chart view
  const generateChartData = () => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    let runningTotal = totalAvailableCash;
    
    return days.map(day => {
      const dayEvents = events.filter(event => 
        format(event.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      
      const dailyChange = dayEvents.reduce((total, event) => {
        return total + (event.type === 'inflow' ? event.amount : -event.amount);
      }, 0);
      
      runningTotal += dailyChange;
      
      return {
        date: format(day, 'MMM dd'),
        fullDate: day,
        cashFlow: runningTotal,
        dailyChange,
        inflow: dayEvents.filter(e => e.type === 'inflow').reduce((sum, e) => sum + e.amount, 0),
        outflow: dayEvents.filter(e => e.type !== 'inflow').reduce((sum, e) => sum + e.amount, 0),
        transactions: dayEvents, // Include actual transaction data
      };
    });
  };

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const dayData = data.activePayload[0].payload;
      const transactions = dayData.transactions || [];
      
      if (transactions.length === 1) {
        // If only one transaction, show it directly
        setSelectedTransaction(transactions[0]);
        setShowTransactionModal(true);
      } else if (transactions.length > 1) {
        // If multiple transactions, show the first one (could be enhanced to show a list)
        setSelectedTransaction(transactions[0]);
        setShowTransactionModal(true);
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
    <Card className="shadow-card h-fit">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center justify-between">
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
            
            <div className="flex items-center space-x-4">
              <Select value={dateRangeOption} onValueChange={handleDateRangeOptionChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="next30">Next 30 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="nextMonth">Next Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
        </div>
      </CardHeader>
      
      {viewType === 'calendar' && (
        <div className="flex items-center justify-center px-6 pb-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-xl font-semibold min-w-[200px] text-center">
              {dateRangeOption === 'next30' ? `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd, yyyy')}` : format(currentDate, 'MMMM yyyy')}
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <CardContent>
        {viewType === 'calendar' ? (
          <>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>
        
            <div className="grid grid-cols-7 gap-2">
              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const dayBalance = getDayBalance(day);
                const totalCash = getTotalCashForDay(day);
                const hasEvents = dayEvents.length > 0;
                
                return (
                  <div
                    key={day.toISOString()}
                     className={`
                       min-h-[120px] p-2 border rounded-lg relative flex flex-col
                       ${dateRangeOption === 'next30' ? '' : (!isSameMonth(day, currentDate) ? 'opacity-30' : '')}
                       ${isToday(day) ? 'ring-2 ring-primary bg-primary/5 cursor-pointer hover:bg-primary/10' : 'bg-background'}
                       ${hasEvents ? 'border-primary/30' : 'border-border'}
                     `}
                    onClick={() => {
                      if (isToday(day) && hasEvents) {
                        // Show first transaction for today
                        setSelectedTransaction(dayEvents[0]);
                        setShowTransactionModal(true);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">
                        {format(day, 'd')}
                      </div>
                      {isToday(day) ? (
                        <div className="text-right">
                          <div className="text-lg font-bold text-finance-positive">
                            ${totalCash.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Available
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-finance-positive font-semibold">
                          ${totalCash.toLocaleString()}
                        </div>
                      )}
                    </div>
                    
                     <div className="flex-1 space-y-1">
                        {hasEvents && (
                         <>
                           {isToday(day) ? (
                             <div className="space-y-1 mt-2">
                               <div className="text-sm text-muted-foreground font-medium">
                                 {dayEvents.length} transaction{dayEvents.length > 1 ? 's' : ''} today
                               </div>
                               <div className="text-xs text-muted-foreground">
                                 Click to view details
                               </div>
                             </div>
                           ) : (
                             <>
                               {dayEvents.slice(0, 2).map(event => (
                                 <div
                                   key={event.id}
                                   className={`
                                     text-xs px-1 py-0.5 rounded truncate flex items-center space-x-1 border cursor-pointer hover:opacity-80 transition-opacity
                                     ${getEventColor(event)}
                                   `}
                                   title={`${event.poName ? `${event.poName} - ` : ''}${event.description}${event.vendor ? ` - ${event.vendor}` : ''}${event.creditCard ? ` - ${event.creditCard}` : ''}`}
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setSelectedTransaction(event);
                                     setShowTransactionModal(true);
                                   }}
                                 >
                                   {getEventIcon(event)}
                                   <span className="truncate">
                                     {event.vendor ? event.vendor : event.description} ${event.amount.toLocaleString()}
                                   </span>
                                 </div>
                               ))}
                               {dayEvents.length > 2 && (
                                 <div 
                                   className="text-xs text-muted-foreground cursor-pointer hover:text-primary"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     // Show the first of the remaining transactions
                                     const remainingTransactions = dayEvents.slice(2);
                                     if (remainingTransactions.length > 0) {
                                       setSelectedTransaction(remainingTransactions[0]);
                                       setShowTransactionModal(true);
                                     }
                                   }}
                                 >
                                   +{dayEvents.length - 2} more (click to view)
                                 </div>
                               )}
                               
                               {dayBalance !== 0 && (
                                 <div className={`
                                   text-xs font-semibold mt-1
                                   ${dayBalance > 0 ? 'text-finance-positive' : 'text-finance-negative'}
                                 `}>
                                   Net: ${dayBalance > 0 ? '+' : ''}${dayBalance.toLocaleString()}
                                 </div>
                               )}
                             </>
                           )}
                         </>
                       )}
                     </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="h-[400px]">
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
        
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
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
              {viewType === 'calendar' 
                ? '+$41,300' 
                : `+$${chartData.reduce((sum, day) => sum + day.dailyChange, 0).toLocaleString()}`
              }
            </span>
          </div>
        </div>
      </CardContent>
      
      <TransactionDetailModal
        transaction={selectedTransaction}
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
      />
    </Card>
  );
};