import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, Calendar, Brain, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";


export const AmazonForecastAccuracy = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracyLogs, setAccuracyLogs] = useState<any[]>([]);

  // Fetch accuracy logs directly from the forecast_accuracy_log table
  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;

      console.log('[Forecast Accuracy] Fetching accuracy logs for user:', user.id);

      const { data, error } = await supabase
        .from('forecast_accuracy_log')
        .select('*')
        .eq('user_id', user.id)
        .order('payout_date', { ascending: false });

      console.log('[Forecast Accuracy] Fetched logs:', data?.length, 'error:', error);
      
      if (!error && data) {
        setAccuracyLogs(data);
      }
    };

    fetchLogs();
  }, [user]);

  // Pre-filter: Exclude extreme outliers with errors over 200%
  const thresholdFiltered = (() => {
    return accuracyLogs.filter(log => Math.abs(log.difference_percentage) <= 200);
  })();

  const thresholdExcluded = accuracyLogs.length - thresholdFiltered.length;

  // Filter out additional outliers using IQR method on threshold-filtered data
  const filteredLogs = (() => {
    if (thresholdFiltered.length === 0) return [];
    if (thresholdFiltered.length < 4) return thresholdFiltered; // Need at least 4 points for IQR
    
    // Calculate absolute percentage errors
    const errors = thresholdFiltered.map(log => Math.abs(log.difference_percentage));
    
    // Sort to calculate quartiles
    const sortedErrors = [...errors].sort((a, b) => a - b);
    const q1Index = Math.floor(sortedErrors.length * 0.25);
    const q3Index = Math.floor(sortedErrors.length * 0.75);
    const q1 = sortedErrors[q1Index];
    const q3 = sortedErrors[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    // Filter out outliers
    return thresholdFiltered.filter((log, idx) => {
      const error = errors[idx];
      return error >= lowerBound && error <= upperBound;
    });
  })();

  // Calculate overall accuracy from filtered logs
  const avgAccuracy = filteredLogs.length > 0
    ? filteredLogs.reduce((sum, log) => sum + (100 - Math.abs(log.difference_percentage)), 0) / filteredLogs.length
    : 0;

  // Calculate MAPE from filtered logs
  const calculatedMAPE = filteredLogs.length > 0
    ? filteredLogs.reduce((sum, log) => sum + Math.abs(log.difference_percentage), 0) / filteredLogs.length
    : 0;

  // Calculate Bias from filtered logs
  const calculatedBias = filteredLogs.length > 0
    ? filteredLogs.reduce((sum, log) => sum + log.difference_percentage, 0) / filteredLogs.length
    : 0;

  const iqrExcluded = thresholdFiltered.length - filteredLogs.length;
  const totalExcluded = thresholdExcluded + iqrExcluded;


  const loadMetrics = async () => {
    console.log('[Forecast Accuracy] Loading metrics... accuracyLogs:', accuracyLogs.length);
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('calculate-forecast-accuracy');
      
      console.log('[Forecast Accuracy] Raw response:', { data, error: invokeError });
      
      if (invokeError) {
        console.error('[Forecast Accuracy] Invoke error:', invokeError);
        setError('Failed to calculate metrics');
        throw invokeError;
      }
      
      if (!data) {
        console.warn('[Forecast Accuracy] No data in response');
        setError('No data returned from calculation');
        return;
      }
      
      console.log('[Forecast Accuracy] Success! Setting metrics:', data.metrics);
      setMetrics(data.metrics);
      
    } catch (error) {
      console.error('[Forecast Accuracy] Exception:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('[Forecast Accuracy] useEffect triggered', { 
      logsCount: accuracyLogs.length,
      hasMetrics: !!metrics,
      isLoading
    });
    
    // Load metrics if we have accuracy logs
    if (accuracyLogs.length > 0 && !metrics && !isLoading) {
      console.log('[Forecast Accuracy] Auto-loading metrics...');
      loadMetrics();
    }
  }, [accuracyLogs.length, metrics, isLoading]);

  if (accuracyLogs.length === 0) {
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
          {accuracyLogs.length > 0 && (
            <Button onClick={loadMetrics} disabled={isLoading} variant="outline" size="sm">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Frontend Outliers Notice */}
        {totalExcluded > 0 && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {totalExcluded} extreme outlier{totalExcluded > 1 ? 's' : ''} excluded from calculations:
              {thresholdExcluded > 0 && ` ${thresholdExcluded} with errors over 200%`}
              {thresholdExcluded > 0 && iqrExcluded > 0 && ', '}
              {iqrExcluded > 0 && `${iqrExcluded} via statistical analysis (IQR)`}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Backend Outliers Notice */}
        {metrics?.outliersExcluded > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {metrics.outliersExcluded} extreme outlier{metrics.outliersExcluded > 1 ? 's' : ''} excluded from detailed analysis for more accurate metrics.
            </AlertDescription>
          </Alert>
        )}

        {/* Overall Accuracy Badge */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground mb-1">Overall Accuracy</span>
            <Badge variant={avgAccuracy >= 90 ? "default" : avgAccuracy >= 75 ? "secondary" : "destructive"} className="text-xl">
              {avgAccuracy.toFixed(1)}%
            </Badge>
            <Progress value={avgAccuracy} className="w-full mt-2" />
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground mb-1">Avg Error (MAPE)</span>
            <span className="text-2xl font-bold">{calculatedMAPE.toFixed(1)}%</span>
            <span className="text-xs text-muted-foreground mt-1">
              {calculatedMAPE < 10 ? '🎯 Excellent' : calculatedMAPE < 20 ? '✓ Good' : '⚠️ High'}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground mb-1">Bias</span>
            <span className={`text-2xl font-bold ${calculatedBias > 0 ? 'text-orange-600' : calculatedBias < 0 ? 'text-blue-600' : 'text-green-600'}`}>
              {calculatedBias > 0 ? '+' : ''}{calculatedBias.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {Math.abs(calculatedBias) < 5 ? '✓ Balanced' : calculatedBias > 0 ? '📉 Over-forecast' : '📈 Under-forecast'}
            </span>
          </div>
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


        {/* Individual Comparisons */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Recent Comparisons ({filteredLogs.length}{totalExcluded > 0 ? ` of ${accuracyLogs.length}` : ''})</h4>
          {filteredLogs.map((log) => {
            const forecastAmount = Number(log.forecasted_amount);
            const actualAmount = Number(log.actual_amount);
            const accuracy = 100 - Math.abs(log.difference_percentage);
            const difference = log.difference_amount;
            const isOver = difference > 0;
            const modelDisplay = log.modeling_method === 'auren_forecast_v1' 
              ? 'Auren Formula V1' 
              : log.modeling_method || 'Unknown Method';
            
            // Calculate actual days between start and end
            const calculatedDays = log.settlement_period_start && log.settlement_close_date
              ? differenceInDays(new Date(log.settlement_close_date), new Date(log.settlement_period_start))
              : log.days_accumulated || 1;

            return (
              <div 
                key={log.id} 
                className="border rounded-lg p-4 space-y-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        Settlement Closed: {format(new Date(log.settlement_close_date || log.payout_date), 'MMM d, yyyy')}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {modelDisplay}
                      </Badge>
                    </div>
                    {log.settlement_period_start && log.settlement_close_date && (
                      <div className="text-xs text-muted-foreground ml-6 mt-1">
                        Period: {format(new Date(log.settlement_period_start), 'MMM d')} - {format(new Date(log.settlement_close_date), 'MMM d')} ({calculatedDays} day{calculatedDays > 1 ? 's' : ''})
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground ml-6">
                      Payout received: {format(new Date(log.payout_date), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <Badge variant={accuracy >= 90 ? "default" : accuracy >= 75 ? "secondary" : "outline"}>
                    {accuracy.toFixed(1)}% accurate
                  </Badge>
                </div>

                {/* Forecast breakdown when multiple days */}
                {log.forecasted_amounts_by_day && log.forecasted_amounts_by_day.length > 1 && (
                  <div className="text-xs space-y-1 bg-muted/50 p-2 rounded ml-6">
                    <div className="font-medium">Forecasts Included:</div>
                    {log.forecasted_amounts_by_day.map((day: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>{format(new Date(day.date), 'MMM d')}</span>
                        <span>${Number(day.amount).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-1 font-semibold">
                      <span>Total:</span>
                      <span>${forecastAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}

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

                <p className="text-xs text-muted-foreground italic">
                  Tracked: {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};