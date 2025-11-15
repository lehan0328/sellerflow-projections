import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Shield, CalendarClock } from "lucide-react";

export const ForecastExplainer = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <CardTitle>How Amazon Payout Forecasting Works</CardTitle>
        </div>
        <CardDescription>
          Understanding the mathematical models behind your cash flow predictions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Data Used</TabsTrigger>
            <TabsTrigger value="biweekly">Bi-Weekly Model</TabsTrigger>
            <TabsTrigger value="daily">Daily Model</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Forecast Models</h3>
                <p className="text-muted-foreground mb-4">
                  We use two different mathematical models depending on your Amazon payout frequency:
                </p>
                <div className="grid gap-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold">Bi-Weekly Settlement Model</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      For accounts paid every 14 days. Calculates eligible amounts, reserves, and expected payouts for each settlement period.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold">Daily Settlement Model</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      For daily payout accounts. Uses statistical modeling based on historical payout patterns, growth trends, and seasonal variations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Safety Net Adjustments</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  All forecasts include your selected safety margin to account for uncertainty:
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">Aggressive: -3%</Badge>
                  <Badge variant="outline">Moderate: -8%</Badge>
                  <Badge variant="outline">Conservative: -15%</Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Transaction Data Sources</h3>
                <p className="text-muted-foreground mb-4">
                  The forecast models analyze multiple types of Amazon financial events:
                </p>
                <div className="space-y-3">
                  <div className="p-3 border-l-4 border-green-500 bg-green-50 dark:bg-green-950 rounded">
                    <h4 className="font-semibold text-sm">Orders/Sales (ShipmentEventList)</h4>
                    <p className="text-xs text-muted-foreground">Revenue from product sales including item charges and fees</p>
                  </div>
                  <div className="p-3 border-l-4 border-red-500 bg-red-50 dark:bg-red-950 rounded">
                    <h4 className="font-semibold text-sm">Refunds (RefundEventList)</h4>
                    <p className="text-xs text-muted-foreground">Money returned to customers for refunded orders</p>
                  </div>
                  <div className="p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950 rounded">
                    <h4 className="font-semibold text-sm">Reimbursements (ShipmentSettleEventList)</h4>
                    <p className="text-xs text-muted-foreground">Amazon reimbursements for lost or damaged inventory</p>
                  </div>
                  <div className="p-3 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950 rounded">
                    <h4 className="font-semibold text-sm">Service Fees (ServiceFeeEventList)</h4>
                    <p className="text-xs text-muted-foreground">Subscription fees and other service charges</p>
                  </div>
                  <div className="p-3 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950 rounded">
                    <h4 className="font-semibold text-sm">Adjustments (AdjustmentEventList)</h4>
                    <p className="text-xs text-muted-foreground">Manual corrections and account adjustments</p>
                  </div>
                  <div className="p-3 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950 rounded">
                    <h4 className="font-semibold text-sm">SAFE-T Claims (SAFETReimbursementEventList)</h4>
                    <p className="text-xs text-muted-foreground">Reimbursements for guarantee claims</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">What We Calculate Per Transaction:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Gross Amount (G)</strong>: Total revenue from the order</li>
                  <li><strong>Fees (F)</strong>: Amazon referral fees (~15%)</li>
                  <li><strong>Shipping Cost (S)</strong>: FBA or shipping charges</li>
                  <li><strong>Ads Cost (A)</strong>: PPC advertising spend</li>
                  <li><strong>Return Rate (r)</strong>: Historical return percentage</li>
                  <li><strong>Chargeback Rate (c)</strong>: Historical chargeback percentage</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="biweekly" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Bi-Weekly Settlement Model</h3>
                <p className="text-muted-foreground mb-4">
                  For accounts with 14-day settlement periods, we calculate payouts based on eligible amounts minus reserves.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Step 1: Calculate Net Amount per Order</h4>
                  <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                    Net<sub>i</sub> = (G<sub>i</sub> - F<sub>i</sub> - S<sub>i</sub> - A<sub>i</sub>) × (1 - r<sub>i</sub>) × (1 - c<sub>i</sub>)
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Accounts for all costs and risk factors to determine actual net revenue per order
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Step 2: Determine Unlock Date</h4>
                  <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                    UnlockDate<sub>i</sub> = DeliveryDate<sub>i</sub> + L
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Where L is your Reserve Lag (default 7 days) - when funds become available for payout
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Step 3: Calculate Eligible Amount per Settlement</h4>
                  <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                    EligInPeriod(s<sub>k</sub>) = Σ DailyEligible(t) for all t in settlement period
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sum of all unlocked amounts during the 14-day settlement window
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Step 4: Calculate Reserve</h4>
                  <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                    Reserve(s<sub>k</sub>) = Σ Net<sub>i</sub> × ReserveMultiplier
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    For recent orders still within the reserve lag period (not yet unlocked)
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-primary/5">
                  <h4 className="font-semibold mb-2">Step 5: Final Payout Calculation</h4>
                  <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                    Payout(s<sub>k</sub>) = [EligInPeriod + Balance<sub>prior</sub> + Adjustments - Reserve] × (1 - SafetyMargin%)
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Final payout after applying your selected safety margin (3%, 8%, or 15%)
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">📊 Example Calculation:</h4>
                <div className="text-sm space-y-1">
                  <p>Eligible in period: $10,000</p>
                  <p>Reserve (7-day lag): $2,500</p>
                  <p>Before adjustment: $7,500</p>
                  <p>Safety margin (8%): -$600</p>
                  <p className="font-semibold text-primary">Expected Payout: $6,900</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="daily" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Daily Settlement Forecast</h3>
                <p className="text-muted-foreground mb-4">
                  For daily payout accounts, we use statistical modeling based on your historical payout patterns to forecast future settlements.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-primary/5">
                  <h4 className="font-semibold mb-2">Statistical Model Approach</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Daily forecasts are calculated using historical payout data, analyzing patterns, trends, and variations in your settlement history.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This approach provides reliable predictions without requiring detailed transaction-level data.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Step 1: Analyze Historical Patterns</h4>
                  <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                    BaseAmount = Avg(RecentPayouts) × AccountSpecificMultipliers
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Calculate average payout amounts from recent settlement history
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Step 2: Apply Growth Trends</h4>
                  <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                    GrowthTrend = (Recent30Days - Previous30Days) / Previous30Days
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Factor in business growth by comparing recent performance to historical baseline
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Step 3: Account for Daily Variation</h4>
                  <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                    DailyVariation = StdDev(HistoricalPayouts) × ConfidenceFactor
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Include natural day-to-day fluctuations observed in your payout history
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Step 4: Apply Safety Net</h4>
                  <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                    FinalForecast = (BaseAmount × GrowthTrend) × (1 - SafetyMargin%)
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Apply your selected safety margin (Conservative: -15%, Moderate: -8%, Aggressive: -3%)
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">📊 Example Calculation:</h4>
                <div className="text-sm space-y-1">
                  <p>• Average recent payout: <strong>$2,500/day</strong></p>
                  <p>• Growth trend: <strong>+15%</strong></p>
                  <p>• Projected base: <strong>$2,875/day</strong></p>
                  <p>• Safety margin (Moderate -8%): <strong>$2,645/day</strong></p>
                </div>
              </div>

              <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
                <h4 className="font-semibold mb-2">💡 Reliability</h4>
                <p className="text-sm text-muted-foreground">
                  The statistical model becomes more accurate as more payout history is accumulated. 
                  It automatically adapts to your business patterns including seasonality and growth trends.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
