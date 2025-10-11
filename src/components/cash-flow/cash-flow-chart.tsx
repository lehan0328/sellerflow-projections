import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Plus, Calendar as CalendarIconLucide, TrendingUp } from "lucide-react";
import { format, subDays, addDays, eachDayOfInterval } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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

interface CashFlowChartProps {
  onAddPurchaseOrder: () => void;
  events?: CashFlowEvent[];
  viewType: 'calendar' | 'chart';
  onViewTypeChange: (type: 'calendar' | 'chart') => void;
}

export const CashFlowChart = ({ 
  onAddPurchaseOrder, 
  events: propEvents, 
  viewType, 
  onViewTypeChange 
}: CashFlowChartProps) => {
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: addDays(new Date(), 30)
  });

  // Sample cash flow events
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
  ];

  const events = propEvents || defaultEvents;
  const totalAvailableCash = 145750;

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
        date: format(day, 'MMM dd, yyyy'),
        fullDate: day,
        cashFlow: runningTotal,
        dailyChange,
        inflow: dayEvents.filter(e => e.type === 'inflow').reduce((sum, e) => sum + e.amount, 0),
        outflow: dayEvents.filter(e => e.type !== 'inflow').reduce((sum, e) => sum + e.amount, 0),
        eventCount: dayEvents.length,
        events: dayEvents
      };
    });
  };

  const chartData = generateChartData();

  const chartConfig = {
    cashFlow: {
      label: "Cash Flow",
      color: "hsl(var(--primary))",
    },
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: new Date(value)
    }));
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <CardTitle className="text-lg">Cash Flow Visualization</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600 font-medium">Healthy</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
              <Button
                variant={viewType === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewTypeChange('calendar')}
                className="px-3"
              >
                <CalendarIconLucide className="h-4 w-4 mr-1" />
                Calendar
              </Button>
              <Button
                variant={viewType === 'chart' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewTypeChange('chart')}
                className="px-3"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Chart
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {viewType === 'chart' && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="start-date" className="text-sm">From:</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={format(dateRange.start, 'yyyy-MM-dd')}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="end-date" className="text-sm">To:</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={format(dateRange.end, 'yyyy-MM-dd')}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
            )}
            <Button size="sm" onClick={onAddPurchaseOrder} className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Purchase Order
            </Button>
          </div>
        </div>
      </CardHeader>

      {viewType === 'chart' && (
        <CardContent>
          <div className="h-[400px]">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={Math.floor(chartData.length / 10)}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number, name: string) => [
                      `$${value.toLocaleString()}`,
                      'Cash Balance'
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="space-y-2">
                            <p className="font-semibold text-base">{label}</p>
                            <div className="text-sm space-y-1.5 border-t pt-2">
                              <p className="font-semibold">
                                Balance: ${data.cashFlow.toLocaleString()}
                              </p>
                              {data.dailyChange !== 0 && (
                                <p className={`font-medium ${data.dailyChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  Net Change: {data.dailyChange > 0 ? '+' : ''}${data.dailyChange.toLocaleString()}
                                </p>
                              )}
                              {data.inflow > 0 && (
                                <p className="text-green-600">↑ Inflow: +${data.inflow.toLocaleString()}</p>
                              )}
                              {data.outflow > 0 && (
                                <p className="text-red-600">↓ Outflow: -${data.outflow.toLocaleString()}</p>
                              )}
                              {data.eventCount > 0 && (
                                <p className="text-muted-foreground text-xs mt-2 pt-2 border-t">
                                  {data.eventCount} transaction{data.eventCount > 1 ? 's' : ''} on this date
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
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          
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
            </div>
            
            <div className="text-sm text-muted-foreground">
              Period Net: <span className="font-semibold text-foreground">
                +${chartData.reduce((sum, day) => sum + day.dailyChange, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};