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
  AlertCircle
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
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AmazonForecastAccuracy } from "@/components/cash-flow/amazon-forecast-accuracy";

export default function AmazonForecast() {
  const navigate = useNavigate();
  const { amazonPayouts } = useAmazonPayouts();
  const { incomeItems } = useIncome();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [forecast, setForecast] = useState<any>(null);

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
    toast({
      title: "Generating AI Forecast",
      description: "Analyzing your Amazon data...",
      duration: 10000
    });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("forecast-amazon-payouts", {
        body: {
          userId: user.id,
          historicalPayouts: amazonPayouts.slice(0, 50), // Last 50 payouts
          historicalData: historicalData
        }
      });

      if (error) {
        console.error('Forecast error:', error);
        throw new Error(error.message || 'Failed to generate forecast');
      }

      if (data?.error) {
        console.error('Forecast function error:', data.error);
        throw new Error(data.error);
      }

      if (data?.forecast) {
        setForecast(data.forecast);
        toast({
          title: "AI Forecast Complete! 🎉",
          description: "Your Amazon payout forecast has been generated. Please refresh the page to see the updated projections.",
          duration: 8000
        });
      }
    } catch (error: any) {
      console.error("Forecast error:", error);
      toast({
        title: "Failed to generate forecast",
        description: error.message || "Please try again",
        variant: "destructive"
      });
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">AI Amazon Payout Forecasting</h1>
        </div>
        <p className="text-muted-foreground">Advanced mathematical modeling powered by AI to predict future Amazon payouts</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Last Payout</CardTitle>
            <Calendar className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.lastPayout.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Most recent</p>
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

      {/* Generate Forecast Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI-Powered Forecast Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Advanced Mathematical Modeling
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Our AI analyzes historical payout patterns, sales velocity, seasonal trends, and growth trajectories 
                  using time series analysis, regression modeling, and predictive algorithms to forecast future Amazon payouts 
                  with high accuracy.
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={generateForecast}
            disabled={isGenerating || amazonPayouts.length < 3}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analyzing Data & Generating Forecast...
              </>
            ) : (
              <>
                <Brain className="h-5 w-5 mr-2" />
                Generate AI Forecast
              </>
            )}
          </Button>

          {amazonPayouts.length < 3 && (
            <p className="text-sm text-amber-600 text-center">
              Need at least 3 historical payouts to generate accurate forecasts
            </p>
          )}
        </CardContent>
      </Card>

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

      {/* Forecast Results */}
      {forecast && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              AI Forecast Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Insights */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                AI Analysis Summary
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {forecast.analysis}
                </div>
              </div>
            </div>

            {/* Forecast Chart */}
            {forecast.predictions && forecast.predictions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Predicted Payouts</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={forecast.predictions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="predicted_amount" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.6}
                      name="Predicted Payout"
                    />
                    {forecast.predictions[0]?.confidence_interval && (
                      <>
                        <Area 
                          type="monotone" 
                          dataKey="upper_bound" 
                          stroke="#06b6d4" 
                          fill="#06b6d4" 
                          fillOpacity={0.2}
                          name="Upper Confidence"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="lower_bound" 
                          stroke="#f59e0b" 
                          fill="#f59e0b" 
                          fillOpacity={0.2}
                          name="Lower Confidence"
                        />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Key Predictions */}
            {forecast.predictions && forecast.predictions.length > 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                {forecast.predictions.slice(0, 3).map((pred: any, idx: number) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {pred.period}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        ${pred.predicted_amount.toLocaleString()}
                      </div>
                      {pred.confidence && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {(pred.confidence * 100).toFixed(0)}% confidence
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Methodology */}
            {forecast.methodology && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2">Forecasting Methodology</h4>
                <p className="text-xs text-muted-foreground">
                  {forecast.methodology}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Forecast Accuracy Archive */}
      <AmazonForecastAccuracy />
    </div>
  );
}
