import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { TrendingUp, TrendingDown, Target, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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

  // Filter payouts that have forecast data (were replaced from forecasts)
  const replacedForecasts = (amazonPayouts as PayoutWithForecast[])?.filter(
    payout => payout.forecast_replaced_at && payout.original_forecast_amount
  ) || [];

  // Calculate overall accuracy
  const avgAccuracy = replacedForecasts.length > 0
    ? replacedForecasts.reduce((sum, p) => sum + (p.forecast_accuracy_percentage || 0), 0) / replacedForecasts.length
    : 0;

  if (replacedForecasts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Forecast Accuracy Archive
          </CardTitle>
          <CardDescription>
            Track how well AI forecasts match actual Amazon payouts
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
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Forecast Accuracy Archive
        </CardTitle>
        <CardDescription>
          Comparing AI forecasts vs actual payouts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Accuracy Badge */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Overall Forecast Accuracy</span>
          <Badge variant={avgAccuracy >= 90 ? "default" : avgAccuracy >= 75 ? "secondary" : "destructive"} className="text-lg">
            {avgAccuracy.toFixed(1)}%
          </Badge>
        </div>

        {/* Individual Comparisons */}
        <div className="space-y-3">
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