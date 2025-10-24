import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { TrendingUp, TrendingDown, Target, Calendar, Brain, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

// Extended type for payouts with forecast comparison fields
type PayoutWithForecast = {
  id: string;
  payout_date: string;
  total_amount: number;
  original_forecast_amount?: number | null;
  forecast_replaced_at?: string | null;
  forecast_accuracy_percentage?: number | null;
};

export const AmazonForecastAccuracy = () => {
  const { amazonPayouts } = useAmazonPayouts();
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter payouts that have forecast data (were replaced from forecasts)
  const replacedForecasts = (amazonPayouts as PayoutWithForecast[])?.filter(
    payout => payout.forecast_replaced_at && payout.original_forecast_amount
  ) || [];

  // Calculate overall accuracy
  const avgAccuracy = replacedForecasts.length > 0
    ? replacedForecasts.reduce((sum, p) => sum + (p.forecast_accuracy_percentage || 0), 0) / replacedForecasts.length
    : 0;

  const loadMetrics = async () => {
    if (replacedForecasts.length === 0) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-forecast-accuracy');
      
      if (error) throw error;
      if (data?.metrics) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error loading accuracy metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (replacedForecasts.length > 0 && !metrics) {
      loadMetrics();
    }
  }, [replacedForecasts.length]);

  if (replacedForecasts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Forecast Accuracy Archive
          </CardTitle>
          <CardDescription>
            Track how well mathematical forecasts match actual Amazon payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No forecast comparisons available yet. Forecasts will be compared when actual payout data arrives.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Forecast Accuracy Tracker
            </CardTitle>
            <CardDescription>
              Mathematical forecasting performance analysis
            </CardDescription>
          </div>
          {replacedForecasts.length > 0 && (
            <Button onClick={loadMetrics} disabled={isLoading} variant="outline" size="sm">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Accuracy Badge */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground mb-1">Overall Accuracy</span>
            <Badge variant={avgAccuracy >= 90 ? "default" : avgAccuracy >= 75 ? "secondary" : "destructive"} className="text-xl">
              {avgAccuracy.toFixed(1)}%
            </Badge>
            <Progress value={avgAccuracy} className="w-full mt-2" />
          </div>

          {metrics && (
            <>
              <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground mb-1">Avg Error (MAPE)</span>
                <span className="text-2xl font-bold">{metrics.mape.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {metrics.mape < 10 ? '🎯 Excellent' : metrics.mape < 20 ? '✓ Good' : '⚠️ High'}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground mb-1">Bias</span>
                <span className={`text-2xl font-bold ${metrics.biasPercentage > 0 ? 'text-orange-600' : metrics.biasPercentage < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                  {metrics.biasPercentage > 0 ? '+' : ''}{metrics.biasPercentage.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {Math.abs(metrics.biasPercentage) < 5 ? '✓ Balanced' : metrics.biasPercentage > 0 ? '📉 Over-forecast' : '📈 Under-forecast'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* AI Insights */}
        {metrics?.insights && metrics.insights.length > 0 && (
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {metrics.insights.map((insight: string, idx: number) => (
                  <p key={idx} className="text-sm">{insight}</p>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Accuracy by Method */}
        {metrics?.byMethod && Object.keys(metrics.byMethod).length > 0 && (
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Accuracy by Forecasting Method
            </h4>
            <div className="space-y-2">
              {Object.entries(metrics.byMethod).map(([method, data]: [string, any]) => (
                <div key={method} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{method.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">({data.count} forecasts)</span>
                    <Badge variant={data.avgAccuracy >= 90 ? "default" : "secondary"}>
                      {data.avgAccuracy.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Comparisons */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Recent Comparisons</h4>
          {replacedForecasts.map((payout) => {
            const forecastAmount = Number(payout.original_forecast_amount);
            const actualAmount = Number(payout.total_amount);
            const accuracy = payout.forecast_accuracy_percentage || 0;
            const difference = actualAmount - forecastAmount;
            const isOver = difference > 0;

            return (
              <div 
                key={payout.id} 
                className="border rounded-lg p-4 space-y-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format(new Date(payout.payout_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <Badge variant={accuracy >= 90 ? "default" : accuracy >= 75 ? "secondary" : "outline"}>
                    {accuracy.toFixed(1)}% accurate
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Forecasted</p>
                    <p className="font-semibold text-blue-600">
                      ${forecastAmount.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-xs">Actual</p>
                    <p className="font-semibold text-green-600">
                      ${actualAmount.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs">Difference</p>
                    <div className="flex items-center gap-1">
                      {isOver ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <p className={`font-semibold ${isOver ? 'text-green-600' : 'text-red-600'}`}>
                        {isOver ? '+' : ''}${difference.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {payout.forecast_replaced_at && (
                  <p className="text-xs text-muted-foreground italic">
                    Updated: {format(new Date(payout.forecast_replaced_at), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};