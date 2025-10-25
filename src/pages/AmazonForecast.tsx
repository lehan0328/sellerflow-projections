import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useIncome } from "@/hooks/useIncome";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { 
  TrendingUp, 
  ArrowLeft,
  Brain,
  Calendar,
  DollarSign,
  LineChart,
  Loader2,
  AlertCircle,
  Target
} from "lucide-react";
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
import { AmazonForecastAccuracy } from "@/components/cash-flow/amazon-forecast-accuracy";
import { ForecastSettings } from "@/components/settings/forecast-settings";
import { BarChart3 } from "lucide-react";

export default function AmazonForecast() {
  const navigate = useNavigate();
  const { amazonPayouts } = useAmazonPayouts();
  const { incomeItems } = useIncome();
  const { amazonAccounts } = useAmazonAccounts();
  const [isGenerating, setIsGenerating] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [amazonTransactions, setAmazonTransactions] = useState<any[]>([]);
  const [isDeletingSampleData, setIsDeletingSampleData] = useState(false);

  // Check if user has 3+ confirmed payouts
  const confirmedPayouts = amazonPayouts.filter(p => p.status === 'confirmed');
  const hasEnoughData = confirmedPayouts.length >= 3;

  // Fetch Amazon transactions for revenue calculation
  const [rollupData, setRollupData] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get transactions from last 12 months - only Order type transactions for revenue
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const [transactionsRes, rollupsRes] = await Promise.all([
          // Fetch detailed transactions (recent data)
          supabase
            .from('amazon_transactions')
            .select('transaction_date, amount, transaction_type, marketplace_name')
            .eq('user_id', user.id)
            .eq('transaction_type', 'Order')
            .gte('transaction_date', twelveMonthsAgo.toISOString())
            .order('transaction_date', { ascending: true }),
          
          // Fetch rollup data (older aggregated data)
          supabase
            .from('amazon_daily_rollups')
            .select('rollup_date, total_revenue, order_count')
            .eq('user_id', user.id)
            .gte('rollup_date', twelveMonthsAgo.toISOString().split('T')[0])
            .order('rollup_date', { ascending: true })
        ]);

        if (transactionsRes.error) throw transactionsRes.error;
        if (rollupsRes.error) console.log('[AmazonForecast] No rollup data:', rollupsRes.error);
        
        setAmazonTransactions(transactionsRes.data || []);
        setRollupData(rollupsRes.data || []);
      } catch (error) {
        console.error('Error fetching Amazon transactions:', error);
      }
    };

    fetchTransactions();
  }, [amazonAccounts]); // Refetch when Amazon accounts change (after sync)

  // Calculate historical metrics with forecasts
  const historicalData = useMemo(() => {
    const monthlyData: Record<string, { revenue: number; actualPayouts: number; forecastedPayouts: number; count: number }> = {};
    
    // Last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[key] = { revenue: 0, actualPayouts: 0, forecastedPayouts: 0, count: 0 };
    }

    // Aggregate revenue from Amazon transactions (order amounts - only positive amounts)
    console.log('[AmazonForecast] Processing transactions:', amazonTransactions.length);
    amazonTransactions.forEach(txn => {
      const amount = Number(txn.amount || 0);
      if (amount > 0) { // Only count positive revenue
        const date = new Date(txn.transaction_date);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyData[key]) {
          monthlyData[key].revenue += amount;
        }
      }
    });

    // Add rollup data (aggregated historical data)
    console.log('[AmazonForecast] Processing rollups:', rollupData.length);
    rollupData.forEach(rollup => {
      const revenue = Number(rollup.total_revenue || 0);
      if (revenue > 0) {
        const date = new Date(rollup.rollup_date);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyData[key]) {
          monthlyData[key].revenue += revenue;
          console.log(`[AmazonForecast] Added rollup ${revenue} to ${key}, new total: ${monthlyData[key].revenue}`);
        }
      }
    });

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

    // Aggregate forecasted payouts - for future periods
    amazonPayouts
      .filter(payout => payout.status === 'forecasted')
      .forEach(payout => {
        const date = new Date(payout.payout_date);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyData[key]) {
          monthlyData[key].forecastedPayouts += Number(payout.total_amount || 0);
        }
      });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      actualPayouts: data.actualPayouts,
      forecastedPayouts: data.forecastedPayouts,
      count: data.count
    }));
  }, [amazonPayouts, amazonTransactions, rollupData]);

  const generateForecast = async () => {
    setIsGenerating(true);
    toast.loading("Generating Mathematical Forecast - Analyzing Amazon transactions and reserves...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("forecast-amazon-payouts-math", {
        body: { userId: user.id }
      });

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
        toast.success(`Mathematical forecast generated! ${data.forecastCount || 0} forecasts created. Refreshing...`);
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
    const confirmedPayouts = amazonPayouts.filter(
      p => p.status === 'confirmed' && p.marketplace_name !== 'Amazon.com'
    );
    
    const totalPayouts = confirmedPayouts.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const avgPayout = confirmedPayouts.length > 0 ? totalPayouts / confirmedPayouts.length : 0;
    const lastPayout = confirmedPayouts.length > 0 ? Number(confirmedPayouts[0].total_amount || 0) : 0;
    
    // Calculate growth rate
    const recentPayouts = confirmedPayouts.slice(0, 3).map(p => Number(p.total_amount || 0));
    const olderPayouts = confirmedPayouts.slice(3, 6).map(p => Number(p.total_amount || 0));
    const recentAvg = recentPayouts.length > 0 ? recentPayouts.reduce((a, b) => a + b, 0) / recentPayouts.length : 0;
    const olderAvg = olderPayouts.length > 0 ? olderPayouts.reduce((a, b) => a + b, 0) / olderPayouts.length : 0;
    const growthRate = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    return {
      totalPayouts,
      avgPayout,
      lastPayout,
      growthRate,
      payoutCount: confirmedPayouts.length
    };
  }, [amazonPayouts]);

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

      {/* Forecast Settings */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <ForecastSettings />
        </div>
        {amazonPayouts.some(p => p.marketplace_name === 'Amazon.com') && (
          <Button 
            onClick={deleteSampleData} 
            disabled={isDeletingSampleData}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            {isDeletingSampleData ? 'Deleting...' : 'Delete Sample Data'}
          </Button>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecast Accuracy</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forecastAccuracy !== null ? `${forecastAccuracy.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {forecastAccuracy !== null && forecastAccuracy >= 90 ? 'Excellent' : 
               forecastAccuracy !== null && forecastAccuracy >= 80 ? 'Good' : 
               forecastAccuracy !== null ? 'Fair' : 'Not enough data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalPayouts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{metrics.payoutCount} payouts tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Payout</CardTitle>
            <LineChart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.avgPayout.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Per payout period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.growthRate >= 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Trend analysis</p>
          </CardContent>
        </Card>
      </div>

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
                  dataKey="revenue" 
                  fill="#10b981" 
                  name="Revenue"
                  radius={[8, 8, 0, 0]}
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
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Revenue"
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
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

      {/* Forecast Accuracy Archive */}
      <AmazonForecastAccuracy />
    </div>
  );
}
