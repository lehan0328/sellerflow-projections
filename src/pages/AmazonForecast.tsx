import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useIncome } from "@/hooks/useIncome";
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

export default function AmazonForecast() {
  const navigate = useNavigate();
  const { amazonPayouts } = useAmazonPayouts();
  const { incomeItems } = useIncome();
  const [isGenerating, setIsGenerating] = useState(false);

  // Check if user has 3+ confirmed payouts
  const confirmedPayouts = amazonPayouts.filter(p => p.status === 'confirmed');
  const hasEnoughData = confirmedPayouts.length >= 3;

  // Calculate historical metrics
  const historicalData = useMemo(() => {
    const monthlyData: Record<string, { sales: number; payouts: number; count: number }> = {};
    
    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[key] = { sales: 0, payouts: 0, count: 0 };
    }

    // Aggregate Amazon payouts
    amazonPayouts.forEach(payout => {
      const date = new Date(payout.payout_date);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyData[key]) {
        monthlyData[key].payouts += Number(payout.total_amount || 0);
        monthlyData[key].sales += Number(payout.orders_total || 0);
        monthlyData[key].count += 1;
      }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      sales: data.sales,
      payouts: data.payouts,
      count: data.count
    }));
  }, [amazonPayouts]);

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

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalPayouts = amazonPayouts.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const avgPayout = amazonPayouts.length > 0 ? totalPayouts / amazonPayouts.length : 0;
    const lastPayout = amazonPayouts.length > 0 ? Number(amazonPayouts[0].total_amount || 0) : 0;
    
    // Calculate growth rate
    const recentPayouts = amazonPayouts.slice(0, 3).map(p => Number(p.total_amount || 0));
    const olderPayouts = amazonPayouts.slice(3, 6).map(p => Number(p.total_amount || 0));
    const recentAvg = recentPayouts.length > 0 ? recentPayouts.reduce((a, b) => a + b, 0) / recentPayouts.length : 0;
    const olderAvg = olderPayouts.length > 0 ? olderPayouts.reduce((a, b) => a + b, 0) / olderPayouts.length : 0;
    const growthRate = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    return {
      totalPayouts,
      avgPayout,
      lastPayout,
      growthRate,
      payoutCount: amazonPayouts.length
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
      {/* Forecast Settings */}
      <ForecastSettings />

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
        <CardHeader>
          <CardTitle>Historical Payout Trends (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
              <Legend />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="sales" 
                fill="#10b981" 
                fillOpacity={0.3}
                stroke="#10b981" 
                name="Sales"
              />
              <Bar 
                yAxisId="right"
                dataKey="payouts" 
                fill="#8b5cf6" 
                name="Payouts"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Forecast Accuracy Archive */}
      <AmazonForecastAccuracy />
    </div>
  );
}
