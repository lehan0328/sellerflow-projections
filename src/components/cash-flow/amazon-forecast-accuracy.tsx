import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, Calendar, Brain, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, parseISO, subDays } from "date-fns";
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
  const [showAll, setShowAll] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number | null>(null);

  // Fetch accuracy logs and user settings
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      console.log('[Forecast Accuracy] Fetching accuracy logs for user:', user.id);

      // Fetch accuracy logs
      const { data, error } = await supabase
        .from('forecast_accuracy_log')
        .select('*')
        .eq('user_id', user.id)
        .order('payout_date', { ascending: false });

      console.log('[Forecast Accuracy] Fetched logs:', data?.length, 'error:', error);
      
      if (!error && data) {
        setAccuracyLogs(data);
      }

      // Fetch user's confidence threshold (safety net)
      const { data: settings } = await supabase
        .from('user_settings')
        .select('forecast_confidence_threshold')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings?.forecast_confidence_threshold !== null && settings?.forecast_confidence_threshold !== undefined) {
        setConfidenceThreshold(settings.forecast_confidence_threshold);
      }
    };

    fetchData();
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

  // Calculate approximate "true model accuracy" by adjusting for safety net
  const adjustedAccuracy = confidenceThreshold !== null 
    ? Math.min(100, avgAccuracy + confidenceThreshold) 
    : null;

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
        
        {/* Safety Net Explanation */}
        {confidenceThreshold !== null && confidenceThreshold > 0 && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <div className="space-y-1">
                <p className="font-medium">Safety Net Active: {confidenceThreshold}%</p>
                <p className="text-sm">
                  Forecasts are intentionally conservative by {confidenceThreshold}% to help you avoid cash flow surprises. 
                  {adjustedAccuracy !== null && (
                    <span className="font-medium"> Your true model accuracy is approximately {adjustedAccuracy.toFixed(1)}%.</span>
                  )}
                </p>
              </div>
            </AlertDescription>
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
            <span className="text-xs text-muted-foreground mb-1">Recent Trend</span>
            <span className={`text-2xl font-bold ${
              (() => {
                if (filteredLogs.length < 4) return '';
                const midpoint = Math.floor(filteredLogs.length / 2);
                const recentHalf = filteredLogs.slice(0, midpoint);
                const olderHalf = filteredLogs.slice(midpoint);
                const recentAvg = recentHalf.reduce((sum, log) => sum + (100 - Math.abs(log.difference_percentage)), 0) / recentHalf.length;
                const olderAvg = olderHalf.reduce((sum, log) => sum + (100 - Math.abs(log.difference_percentage)), 0) / olderHalf.length;
                const trend = recentAvg - olderAvg;
                return trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : '';
              })()
            }`}>
              {(() => {
                if (filteredLogs.length < 4) return 'N/A';
                const midpoint = Math.floor(filteredLogs.length / 2);
                const recentHalf = filteredLogs.slice(0, midpoint);
                const olderHalf = filteredLogs.slice(midpoint);
                const recentAvg = recentHalf.reduce((sum, log) => sum + (100 - Math.abs(log.difference_percentage)), 0) / recentHalf.length;
                const olderAvg = olderHalf.reduce((sum, log) => sum + (100 - Math.abs(log.difference_percentage)), 0) / olderHalf.length;
                const trend = recentAvg - olderAvg;
                return trend > 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`;
              })()}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {(() => {
                if (filteredLogs.length < 4) return 'Need more data';
                const midpoint = Math.floor(filteredLogs.length / 2);
                const recentHalf = filteredLogs.slice(0, midpoint);
                const olderHalf = filteredLogs.slice(midpoint);
                const recentAvg = recentHalf.reduce((sum, log) => sum + (100 - Math.abs(log.difference_percentage)), 0) / recentHalf.length;
                const olderAvg = olderHalf.reduce((sum, log) => sum + (100 - Math.abs(log.difference_percentage)), 0) / olderHalf.length;
                const trend = recentAvg - olderAvg;
                return trend > 2 ? '📈 Improving' : trend < -2 ? '📉 Declining' : '➡️ Stable';
              })()}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground mb-1">Confidence Score</span>
            <span className={`text-2xl font-bold ${
              (() => {
                if (filteredLogs.length < 3) return '';
                const recentLogs = filteredLogs.slice(0, Math.min(10, filteredLogs.length));
                const errors = recentLogs.map(log => Math.abs(log.difference_percentage));
                const mean = errors.reduce((sum, err) => sum + err, 0) / errors.length;
                const variance = errors.reduce((sum, err) => sum + Math.pow(err - mean, 2), 0) / errors.length;
                const stdDev = Math.sqrt(variance);
                const confidence = Math.max(0, Math.min(100, 100 - stdDev));
                return confidence >= 80 ? 'text-green-600' : confidence >= 60 ? 'text-yellow-600' : 'text-red-600';
              })()
            }`}>
              {(() => {
                if (filteredLogs.length < 3) return 'N/A';
                const recentLogs = filteredLogs.slice(0, Math.min(10, filteredLogs.length));
                const errors = recentLogs.map(log => Math.abs(log.difference_percentage));
                const mean = errors.reduce((sum, err) => sum + err, 0) / errors.length;
                const variance = errors.reduce((sum, err) => sum + Math.pow(err - mean, 2), 0) / errors.length;
                const stdDev = Math.sqrt(variance);
                const confidence = Math.max(0, Math.min(100, 100 - stdDev));
                return confidence.toFixed(0);
              })()}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {(() => {
                if (filteredLogs.length < 3) return 'Need more data';
                const recentLogs = filteredLogs.slice(0, Math.min(10, filteredLogs.length));
                const errors = recentLogs.map(log => Math.abs(log.difference_percentage));
                const mean = errors.reduce((sum, err) => sum + err, 0) / errors.length;
                const variance = errors.reduce((sum, err) => sum + Math.pow(err - mean, 2), 0) / errors.length;
                const stdDev = Math.sqrt(variance);
                const confidence = Math.max(0, Math.min(100, 100 - stdDev));
                return confidence >= 80 ? '🎯 High' : confidence >= 60 ? '✓ Moderate' : '⚠️ Low';
              })()}
            </span>
          </div>
        </div>



        {/* Individual Comparisons */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Recent Comparisons ({filteredLogs.length}{totalExcluded > 0 ? ` of ${accuracyLogs.length}` : ''})</h4>
            {filteredLogs.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show Less' : 'See All'}
              </Button>
            )}
          </div>
          {(showAll ? filteredLogs : filteredLogs.slice(0, 5)).map((log) => {
            const forecastAmount = Number(log.forecasted_amount);
            const actualAmount = Number(log.actual_amount);
            const accuracy = 100 - Math.abs(log.difference_percentage);
            const difference = log.difference_amount;
            const isOver = difference > 0;
            const modelDisplay = log.modeling_method === 'auren_forecast_v1' 
              ? 'Auren Formula V1' 
              : log.modeling_method || 'Unknown Method';
            
            // Amazon uses Pacific Time, subtract 1 day to display correctly
            const startDate = log.settlement_period_start ? subDays(parseISO(log.settlement_period_start), 1) : null;
            const endDate = log.settlement_close_date ? subDays(parseISO(log.settlement_close_date), 1) : null;
            
            // Calculate days between start and end
            const calculatedDays = startDate && endDate
              ? differenceInDays(endDate, startDate)
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
                        Settlement Closed: {endDate ? format(endDate, 'MMM d, yyyy') : format(parseISO(log.payout_date), 'MMM d, yyyy')}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {modelDisplay}
                      </Badge>
                    </div>
                    {startDate && endDate && (
                      <div className="text-xs text-muted-foreground ml-6 mt-1">
                        Period: {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')} ({calculatedDays} day{calculatedDays > 1 ? 's' : ''})
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground ml-6">
                      Payout received: {format(subDays(parseISO(log.payout_date), 1), 'MMM d, yyyy')}
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