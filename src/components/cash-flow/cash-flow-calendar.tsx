import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";

interface CashFlowEvent {
  id: string;
  type: 'inflow' | 'outflow';
  amount: number;
  description: string;
  supplier?: string;
  date: Date;
}

interface CashFlowCalendarProps {
  onAddPurchaseOrder: () => void;
}

export const CashFlowCalendar = ({ onAddPurchaseOrder }: CashFlowCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Sample cash flow events
  const [events] = useState<CashFlowEvent[]>([
    {
      id: '1',
      type: 'inflow',
      amount: 25000,
      description: 'Amazon Payout',
      date: new Date(2024, 0, 15)
    },
    {
      id: '2',
      type: 'outflow',
      amount: 8500,
      description: 'Inventory Purchase',
      supplier: 'Global Supplier Co.',
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
      type: 'outflow',
      amount: 3200,
      description: 'PPC Campaign',
      supplier: 'Amazon Advertising',
      date: new Date(2024, 0, 25)
    }
  ]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

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

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Cash Flow Calendar</CardTitle>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" onClick={onAddPurchaseOrder} className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Purchase Order
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
            const hasEvents = dayEvents.length > 0;
            
            return (
              <div
                key={day.toISOString()}
                className={`
                  min-h-[80px] p-2 border rounded-lg relative
                  ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}
                  ${isToday(day) ? 'ring-2 ring-primary bg-primary/5' : 'bg-background'}
                  ${hasEvents ? 'border-primary/30' : 'border-border'}
                `}
              >
                <div className="text-sm font-medium mb-1">
                  {format(day, 'd')}
                </div>
                
                {hasEvents && (
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className={`
                          text-xs px-1 py-0.5 rounded truncate
                          ${event.type === 'inflow' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }
                        `}
                        title={`${event.description}${event.supplier ? ` - ${event.supplier}` : ''}`}
                      >
                        ${event.amount.toLocaleString()}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                    
                    {dayBalance !== 0 && (
                      <div className={`
                        text-xs font-semibold
                        ${dayBalance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                      `}>
                        Net: ${dayBalance > 0 ? '+' : ''}${dayBalance.toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>Inflows</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>Outflows</span>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Monthly Net: <span className="font-semibold text-foreground">
              +$41,300
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};