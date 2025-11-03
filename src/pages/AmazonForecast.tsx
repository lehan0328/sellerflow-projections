import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useIncome } from "@/hooks/useIncome";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { 
  TrendingUp, 
  ArrowLeft,
  Brain,
  Calendar as CalendarIcon,
  DollarSign,
  LineChart,
  Loader2,
  AlertCircle,
  Target
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart
} from "recharts";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { AmazonForecastAccuracy } from "@/components/cash-flow/amazon-forecast-accuracy";
import { ForecastSettings } from "@/components/settings/forecast-settings";
import { DailyCashoutBanner } from "@/components/cash-flow/daily-cashout-banner";
import { BarChart3 } from "lucide-react";

export default function AmazonForecast() {
  const navigate = useNavigate();
  const { amazonPayouts } = useAmazonPayouts();
  const { incomeItems } = useIncome();
  const { amazonAccounts } = useAmazonAccounts();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAllForecasts, setShowAllForecasts] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [isDeletingSampleData, setIsDeletingSampleData] = useState(false);
  const [growthTimeframe, setGrowthTimeframe] = useState<'30d' | '60d' | '90d' | '6m' | '1y'>('1y');
  const [avgPayoutPeriod, setAvgPayoutPeriod] = useState<string>(format(new Date(), 'yyyy-MM'));

  // Check if user has 3+ confirmed payouts
  const confirmedPayouts = amazonPayouts.filter(p => p.status === 'confirmed');
  const hasEnoughData = confirmedPayouts.length >= 3;

  // Calculate historical metrics with forecasts
  const historicalData = useMemo(() => {
    const monthlyData: Record<string, { actualPayouts: number; forecastedPayouts: number; count: number }> = {};
    
    // Last 12 months + current month
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[key] = { actualPayouts: 0, forecastedPayouts: 0, count: 0 };
    }

    // Also add next 3 months for future forecasts
    for (let i = 1; i <= 3; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyData[key]) {
        monthlyData[key] = { actualPayouts: 0, forecastedPayouts: 0, count: 0 };
      }
    }

    // Aggregate actual payouts - only confirmed payouts
    amazonPayouts
      .filter(payout => payout.status === 'confirmed')
      .forEach(payout => {
        const date = new Date(payout.payout_date);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyData[key]) {
          monthlyData[key].actualPayouts += Number(payout.total_amount || 0);
          monthlyData[key].count += 1;
        }
      });

    // Aggregate forecasted payouts - show them even if no confirmed payouts exist
    amazonPayouts
      .filter(payout => payout.status === 'forecasted')
      .forEach(payout => {
        const date = new Date(payout.payout_date);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        // Create month if it doesn't exist (for future forecasts)
        if (!monthlyData[key]) {
          monthlyData[key] = { actualPayouts: 0, forecastedPayouts: 0, count: 0 };
        }
        monthlyData[key].forecastedPayouts += Number(payout.total_amount || 0);
      });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      actualPayouts: data.actualPayouts,
      forecastedPayouts: data.forecastedPayouts,
      count: data.count
    }));
  }, [amazonPayouts]);

  const generateForecast = async () => {
    setIsGenerating(true);
    toast.loading("Cleaning up stale forecasts and regenerating...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // First cleanup and regenerate
      const { data, error } = await supabase.functions.invoke("cleanup-and-regenerate-forecasts");

      if (error) {
        console.error('Forecast error:', error);
        throw new Error(error.message || 'Failed to generate forecast');
      }

      if (data?.error) {
        console.error('Forecast function error:', data.error);
        throw new Error(data.error);
      }

      if (data?.success) {
        toast.dismiss();
        toast.success(data.message || 'Forecasts regenerated successfully! Refreshing...');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error: any) {
      console.error("Forecast error:", error);
      toast.error(error.message || "Failed to generate forecast. Please try again");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteSampleData = async () => {
    setIsDeletingSampleData(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-sample-amazon-data");

      if (error) throw error;

      if (data?.success) {
        toast.success(`Sample data deleted: ${data.deleted.payouts} payouts, ${data.deleted.transactions} transactions`);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete sample data");
    } finally {
      setIsDeletingSampleData(false);
    }
  };

  // Calculate key metrics
  const metrics = useMemo(() => {
    // Filter to only confirmed payouts and exclude sample data
    const confirmedPayouts = amazonPayouts.filter(p => {
      return p.status === 'confirmed' && p.marketplace_name !== 'Amazon.com';
    });
    
    const totalPayouts = confirmedPayouts.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    
    // Calculate average daily payout based on selected period
    let avgPayout = 0;
    let avgPayoutLabel = '';
    
    if (confirmedPayouts.length > 0) {
      let filteredPayouts = confirmedPayouts;
      
      if (avgPayoutPeriod === '12-months') {
        // Last 12 months
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
        filteredPayouts = confirmedPayouts.filter(p => new Date(p.payout_date) >= twelveMonthsAgo);
        avgPayoutLabel = 'Last 12 months';
        
        const periodTotal = filteredPayouts.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
        avgPayout = periodTotal / 365; // Average per day over 365 days
      } else {
        // Specific month (YYYY-MM format)
        const [year, month] = avgPayoutPeriod.split('-').map(Number);
        filteredPayouts = confirmedPayouts.filter(p => {
          const payoutDate = new Date(p.payout_date);
          return payoutDate.getFullYear() === year && payoutDate.getMonth() === month - 1;
        });
        
        const monthDate = new Date(year, month - 1, 1);
        avgPayoutLabel = format(monthDate, 'MMMM yyyy');
        
        // Calculate days in selected month
        const daysInMonth = new Date(year, month, 0).getDate();
        const periodTotal = filteredPayouts.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
        avgPayout = daysInMonth > 0 ? periodTotal / daysInMonth : 0;
      }
    }
    
    const lastPayout = confirmedPayouts.length > 0 ? Number(confirmedPayouts[0].total_amount || 0) : 0;
    
    // Calculate growth rate based on selected timeframe
    const now = new Date();
    let cutoffDate = new Date();
    let comparisonPeriod = '';
    
    switch(growthTimeframe) {
      case '30d':
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        comparisonPeriod = 'last 30 days';
        break;
      case '60d':
        cutoffDate.setDate(cutoffDate.getDate() - 60);
        comparisonPeriod = 'last 60 days';
        break;
      case '90d':
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        comparisonPeriod = 'last 90 days';
        break;
      case '6m':
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        comparisonPeriod = 'last 6 months';
        break;
      case '1y':
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        comparisonPeriod = 'last year';
        break;
    }
    
    // Split payouts into current period and previous period
    const midpointDate = new Date(cutoffDate.getTime() + (now.getTime() - cutoffDate.getTime()) / 2);
    
    const recentPayouts = confirmedPayouts.filter(p => new Date(p.payout_date) >= midpointDate);
    const olderPayouts = confirmedPayouts.filter(p => 
      new Date(p.payout_date) >= cutoffDate && new Date(p.payout_date) < midpointDate
    );
    
    const recentTotal = recentPayouts.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const olderTotal = olderPayouts.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    
    const growthRate = olderTotal > 0 ? ((recentTotal - olderTotal) / olderTotal) * 100 : 0;

    // Find earliest payout date
    const earliestPayoutDate = confirmedPayouts.length > 0 
      ? confirmedPayouts.reduce((earliest, p) => {
          const payoutDate = new Date(p.payout_date);
          return payoutDate < earliest ? payoutDate : earliest;
        }, new Date(confirmedPayouts[0].payout_date))
      : null;

    return {
      totalPayouts,
      avgPayout,
      avgPayoutLabel,
      lastPayout,
      growthRate,
      payoutCount: confirmedPayouts.length,
      comparisonPeriod,
      earliestPayoutDate
    };
  }, [amazonPayouts, growthTimeframe, avgPayoutPeriod]);

  // Calculate forecast accuracy
  const [forecastAccuracy, setForecastAccuracy] = useState<number | null>(null);

  useEffect(() => {
    const fetchAccuracy = async () => {
      try {
        const { data } = await supabase
          .from('forecast_accuracy_log')
          .select('difference_percentage')
          .limit(10);

        if (data && data.length > 0) {
          const avgError = data.reduce((sum, log) => 
            sum + Math.abs(log.difference_percentage), 0
          ) / data.length;
          const accuracy = 100 - avgError;
          setForecastAccuracy(Math.max(0, Math.min(100, accuracy)));
        }
      } catch (error) {
        console.error('Error fetching forecast accuracy:', error);
      }
    };

    fetchAccuracy();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* No Amazon Account Alert */}
      {amazonAccounts.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-amber-900">No Amazon Account Connected</h3>
                <p className="text-sm text-amber-800">
                  To use Amazon Payout Forecasting, you need to first connect your Amazon Seller Central account.
                </p>
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  variant="outline" 
                  className="mt-2 border-amber-600 text-amber-900 hover:bg-amber-100"
                >
                  Go to Dashboard to Connect Amazon
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Payouts Alert */}
      {amazonAccounts.length > 0 && amazonPayouts.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900">No Payout Data Available</h3>
                <p className="text-sm text-blue-800">
                  Your Amazon account is connected, but we haven't synced any payout data yet. Please sync your Amazon account to retrieve payout information before generating forecasts.
                </p>
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  variant="outline" 
                  className="mt-2 border-blue-600 text-blue-900 hover:bg-blue-100"
                >
                  Go to Dashboard to Sync
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mathematical Forecast Settings */}
      <ForecastSettings />

      {/* Daily Cashout Rollover Detection Banner */}
      {amazonAccounts.length > 0 && (() => {
        // Find first daily payout account
        const dailyAccount = amazonAccounts.find(
          acc => acc.payout_frequency === 'daily'
        );
        
        // Get forecasted payouts for that account
        const forecastedPayouts = amazonPayouts
          .filter(p => p.status === 'forecasted' && p.amazon_account_id === dailyAccount?.id)
          .map(p => ({
            payout_date: p.payout_date,
            total_amount: Number(p.total_amount || 0)
          }));

        return dailyAccount && forecastedPayouts.length > 0 ? (
          <DailyCashoutBanner
            amazonAccountId={dailyAccount.id}
            forecastedPayouts={forecastedPayouts}
            onCashoutMarked={() => {
              // Refresh the page to update forecasts
              setTimeout(() => window.location.reload(), 1000);
            }}
          />
        ) : null;
      })()}

      {/* Key Metrics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Overview Metrics</CardTitle>
            <CardDescription>Key performance indicators for your Amazon payouts</CardDescription>
          </div>
          {amazonPayouts.some(p => p.marketplace_name === 'Amazon.com') && (
            <Button 
              onClick={deleteSampleData} 
              disabled={isDeletingSampleData}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              {isDeletingSampleData ? 'Deleting...' : 'Delete Sample Data'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-background rounded-lg border p-4">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium">Forecast Accuracy</p>
                <Target className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold">
                {forecastAccuracy !== null ? `${forecastAccuracy.toFixed(1)}%` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {forecastAccuracy !== null && forecastAccuracy >= 90 ? 'Excellent' : 
                 forecastAccuracy !== null && forecastAccuracy >= 80 ? 'Good' : 
                 forecastAccuracy !== null ? 'Fair' : 'Not enough data'}
              </p>
            </div>

            <div className="bg-background rounded-lg border p-4">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium">Total Payouts</p>
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold">${metrics.totalPayouts.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.payoutCount} payouts tracked
                {metrics.earliestPayoutDate && (
                  <> • Starting {format(metrics.earliestPayoutDate, 'MMM d, yyyy')}</>
                )}
              </p>
            </div>

            <div className="bg-background rounded-lg border p-4">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Avg Daily Payout</p>
                  <Select value={avgPayoutPeriod} onValueChange={setAvgPayoutPeriod}>
                    <SelectTrigger className="h-7 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12-months">12 Months</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => {
                        const date = new Date();
                        date.setMonth(date.getMonth() - i);
                        const value = format(date, 'yyyy-MM');
                        const label = format(date, 'MMM yyyy');
                        return <SelectItem key={`month-${value}-${i}`} value={value}>{label}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <LineChart className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold">${metrics.avgPayout.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{metrics.avgPayoutLabel}</p>
            </div>

            <div className="bg-background rounded-lg border p-4">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Growth Rate</p>
                  <Select value={growthTimeframe} onValueChange={(value: any) => setGrowthTimeframe(value)}>
                    <SelectTrigger className="h-7 w-[90px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30d">30 Days</SelectItem>
                      <SelectItem value="60d">60 Days</SelectItem>
                      <SelectItem value="90d">90 Days</SelectItem>
                      <SelectItem value="6m">6 Months</SelectItem>
                      <SelectItem value="1y">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className={`text-2xl font-bold ${metrics.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.growthRate >= 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">vs previous period</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Trends */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Forecast vs Actual Payouts - Full Year</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Bar
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
              className="gap-2"
            >
              <LineChart className="h-4 w-4" />
              Line
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'bar' ? (
              <BarChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => `$${Number(value).toLocaleString()}`}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar
                  dataKey="forecastedPayouts" 
                  fill="#f59e0b" 
                  name="Forecasted Payouts"
                  radius={[8, 8, 0, 0]}
                />
                <Bar 
                  dataKey="actualPayouts" 
                  fill="#8b5cf6" 
                  name="Actual Payouts"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            ) : (
              <RechartsLineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => `$${Number(value).toLocaleString()}`}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="forecastedPayouts" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  name="Forecasted Payouts"
                  dot={{ fill: '#f59e0b', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone"
                  dataKey="actualPayouts" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  name="Actual Payouts"
                  dot={{ fill: '#8b5cf6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </RechartsLineChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>


      {/* Forecasted Payouts Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Upcoming Forecasted Payouts
          </CardTitle>
          <CardDescription>
            Mathematical projections based on historical settlement patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {amazonPayouts.filter(p => p.status === 'forecasted').length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No forecasted payouts available. Generate forecasts to see predictions.
            </p>
          ) : (
            <>
              {/* Recent Growth Trends - Shown once */}
              <div className="mb-6 px-4 py-4 bg-muted/30 border rounded-lg text-xs space-y-2">
                <div className="font-semibold text-muted-foreground mb-2">Recent Growth Trends:</div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last 30 Days Total:</span>
                      <span className="font-mono">
                        ${(() => {
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const thirtyDaysAgo = new Date(now);
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          const total = confirmedPayouts
                            .filter(p => {
                              const date = new Date(p.payout_date);
                              return date >= thirtyDaysAgo && date <= now;
                            })
                            .reduce((sum, p) => sum + p.total_amount, 0);
                          return total.toLocaleString();
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last 60 Days Total:</span>
                      <span className="font-mono">
                        ${(() => {
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const sixtyDaysAgo = new Date(now);
                          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                          const total = confirmedPayouts
                            .filter(p => {
                              const date = new Date(p.payout_date);
                              return date >= sixtyDaysAgo && date <= now;
                            })
                            .reduce((sum, p) => sum + p.total_amount, 0);
                          return total.toLocaleString();
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground font-semibold">30-Day Growth:</span>
                      <span className={`font-mono font-semibold ${(() => {
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);
                        const thirtyDaysAgo = new Date(now);
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        const sixtyDaysAgo = new Date(now);
                        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                        
                        const last30 = confirmedPayouts
                          .filter(p => {
                            const date = new Date(p.payout_date);
                            return date >= thirtyDaysAgo && date <= now;
                          })
                          .reduce((sum, p) => sum + p.total_amount, 0);
                        
                        const prev30 = confirmedPayouts
                          .filter(p => {
                            const date = new Date(p.payout_date);
                            return date >= sixtyDaysAgo && date < thirtyDaysAgo;
                          })
                          .reduce((sum, p) => sum + p.total_amount, 0);
                        
                        const growth = prev30 > 0 ? ((last30 - prev30) / prev30 * 100) : 0;
                        return growth >= 0 ? 'text-green-600' : 'text-red-600';
                      })()}`}>
                        {(() => {
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const thirtyDaysAgo = new Date(now);
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          const sixtyDaysAgo = new Date(now);
                          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                          
                          const last30 = confirmedPayouts
                            .filter(p => {
                              const date = new Date(p.payout_date);
                              return date >= thirtyDaysAgo && date <= now;
                            })
                            .reduce((sum, p) => sum + p.total_amount, 0);
                          
                          const prev30 = confirmedPayouts
                            .filter(p => {
                              const date = new Date(p.payout_date);
                              return date >= sixtyDaysAgo && date < thirtyDaysAgo;
                            })
                            .reduce((sum, p) => sum + p.total_amount, 0);
                          
                          const growth = prev30 > 0 ? ((last30 - prev30) / prev30 * 100) : 0;
                          return growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
                        })()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last 60 Days Avg/Day:</span>
                      <span className="font-mono">
                        ${(() => {
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const sixtyDaysAgo = new Date(now);
                          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                          const total = confirmedPayouts
                            .filter(p => {
                              const date = new Date(p.payout_date);
                              return date >= sixtyDaysAgo && date <= now;
                            })
                            .reduce((sum, p) => sum + p.total_amount, 0);
                          return (total / 60).toFixed(0);
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last 90 Days Total:</span>
                      <span className="font-mono">
                        ${(() => {
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const ninetyDaysAgo = new Date(now);
                          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                          const total = confirmedPayouts
                            .filter(p => {
                              const date = new Date(p.payout_date);
                              return date >= ninetyDaysAgo && date <= now;
                            })
                            .reduce((sum, p) => sum + p.total_amount, 0);
                          return total.toLocaleString();
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground font-semibold">60-Day Growth:</span>
                      <span className={`font-mono font-semibold ${(() => {
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);
                        const sixtyDaysAgo = new Date(now);
                        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                        const oneTwentyDaysAgo = new Date(now);
                        oneTwentyDaysAgo.setDate(oneTwentyDaysAgo.getDate() - 120);
                        
                        const last60 = confirmedPayouts
                          .filter(p => {
                            const date = new Date(p.payout_date);
                            return date >= sixtyDaysAgo && date <= now;
                          })
                          .reduce((sum, p) => sum + p.total_amount, 0);
                        
                        const prev60 = confirmedPayouts
                          .filter(p => {
                            const date = new Date(p.payout_date);
                            return date >= oneTwentyDaysAgo && date < sixtyDaysAgo;
                          })
                          .reduce((sum, p) => sum + p.total_amount, 0);
                        
                        const growth = prev60 > 0 ? ((last60 - prev60) / prev60 * 100) : 0;
                        return growth >= 0 ? 'text-green-600' : 'text-red-600';
                      })()}`}>
                        {(() => {
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const sixtyDaysAgo = new Date(now);
                          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                          const oneTwentyDaysAgo = new Date(now);
                          oneTwentyDaysAgo.setDate(oneTwentyDaysAgo.getDate() - 120);
                          
                          const last60 = confirmedPayouts
                            .filter(p => {
                              const date = new Date(p.payout_date);
                              return date >= sixtyDaysAgo && date <= now;
                            })
                            .reduce((sum, p) => sum + p.total_amount, 0);
                          
                          const prev60 = confirmedPayouts
                            .filter(p => {
                              const date = new Date(p.payout_date);
                              return date >= oneTwentyDaysAgo && date < sixtyDaysAgo;
                            })
                            .reduce((sum, p) => sum + p.total_amount, 0);
                          
                          const growth = prev60 > 0 ? ((last60 - prev60) / prev60 * 100) : 0;
                          return growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t">
                  Based on {confirmedPayouts.length} confirmed payout{confirmedPayouts.length !== 1 ? 's' : ''} from historical data
                </div>
              </div>

              <div className="space-y-3">
                {amazonPayouts
                  .filter(p => p.status === 'forecasted')
                  .sort((a, b) => new Date(a.payout_date).getTime() - new Date(b.payout_date).getTime())
                  .slice(0, showAllForecasts ? undefined : 5)
                  .map((payout, index) => {
                    // Calculate which period this is (0-5 for 6 bi-weekly forecasts)
                    const periodIndex = index;
                    
                    // Extract calculation details from payout fields
                    const eligibleAmount = payout.eligible_in_period || 0;
                    const reserveAmount = payout.reserve_amount || 0;
                    const unavailableAmount = eligibleAmount + reserveAmount - payout.total_amount;
                    const daysInPeriod = 14;
                    const avgDailyEligible = eligibleAmount / daysInPeriod;
                    
                    return (
                      <div 
                        key={payout.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {format(new Date(payout.payout_date), 'MMM dd, yyyy')}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Settlement ID: {payout.settlement_id}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-lg font-semibold text-amber-600">
                                ${payout.total_amount.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Forecasted (Period {periodIndex + 1})
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {amazonPayouts.filter(p => p.status === 'forecasted').length > 5 && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllForecasts(!showAllForecasts)}
                  >
                    {showAllForecasts ? 'Show Less' : `Show All (${amazonPayouts.filter(p => p.status === 'forecasted').length} forecasts)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Forecast Accuracy Archive */}
      <AmazonForecastAccuracy />
    </div>
  );
}
