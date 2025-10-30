import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Scale, TrendingUp, Calendar, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type PayoutFrequency = "daily" | "biweekly";

const WeightedForecasts = () => {
  const { toast } = useToast();
  const { amazonPayouts } = useAmazonPayouts();
  const [payoutFrequency, setPayoutFrequency] = useState<PayoutFrequency>("daily");
  const [transactionWeight, setTransactionWeight] = useState([50]);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate payout frequency from historical data
  useEffect(() => {
    if (amazonPayouts && amazonPayouts.length > 1) {
      const sortedPayouts = [...amazonPayouts]
        .filter(p => p.status === 'confirmed')
        .sort((a, b) => new Date(a.payout_date).getTime() - new Date(b.payout_date).getTime());

      if (sortedPayouts.length >= 2) {
        const intervals = [];
        for (let i = 1; i < Math.min(sortedPayouts.length, 5); i++) {
          const daysBetween = differenceInDays(
            new Date(sortedPayouts[i].payout_date),
            new Date(sortedPayouts[i - 1].payout_date)
          );
          intervals.push(daysBetween);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const detectedFrequency = avgInterval <= 3 ? "daily" : "biweekly";
        setPayoutFrequency(detectedFrequency);
      }
    }
  }, [amazonPayouts]);

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('forecast_settings')
        .eq('user_id', user.id)
        .single();

      if (data?.forecast_settings) {
        const settings = data.forecast_settings as any;
        if (settings.payoutFrequency) setPayoutFrequency(settings.payoutFrequency);
        if (settings.transactionWeight !== undefined) setTransactionWeight([settings.transactionWeight]);
      }
    };

    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const settings = {
        payoutFrequency,
        transactionWeight: transactionWeight[0],
      };

      const { error } = await supabase
        .from('profiles')
        .update({ forecast_settings: settings })
        .eq('user_id', user.id);

      if (error) throw error;

      // Trigger forecast regeneration with new weights
      await supabase.functions.invoke('forecast-amazon-payouts', {
        body: { forceRegenerate: true }
      });

      toast({
        title: 'Settings saved',
        description: 'Your forecast weights have been updated and forecasts are being regenerated.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const payoutWeight = 100 - transactionWeight[0];

  // Get recommended weights based on frequency
  const getRecommendedWeights = () => {
    if (payoutFrequency === "daily") {
      return {
        transaction: 60,
        payout: 40,
        description: "Daily payouts benefit from more transaction data weighting since patterns emerge quickly."
      };
    } else {
      return {
        transaction: 40,
        payout: 60,
        description: "Bi-weekly payouts are more stable and historical payout averages are more reliable."
      };
    }
  };

  const recommended = getRecommendedWeights();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Scale className="h-8 w-8" />
          Weighted Forecasts
        </h1>
        <p className="text-muted-foreground mt-1">
          Customize how your Amazon payout forecasts are calculated by adjusting the weight between transaction trends and payout history
        </p>
      </div>

      {/* Payout Frequency Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payout Frequency
          </CardTitle>
          <CardDescription>
            Select your Amazon payout schedule to optimize forecast accuracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={payoutFrequency} onValueChange={(value) => setPayoutFrequency(value as PayoutFrequency)}>
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="daily" id="daily" />
              <Label htmlFor="daily" className="flex-1 cursor-pointer">
                <div className="font-semibold">Daily Payouts</div>
                <div className="text-sm text-muted-foreground">Receive payouts every 1-3 days</div>
              </Label>
              {payoutFrequency === "daily" && (
                <Badge variant="secondary">Active</Badge>
              )}
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="biweekly" id="biweekly" />
              <Label htmlFor="biweekly" className="flex-1 cursor-pointer">
                <div className="font-semibold">Bi-weekly Payouts</div>
                <div className="text-sm text-muted-foreground">Receive payouts every 14 days</div>
              </Label>
              {payoutFrequency === "biweekly" && (
                <Badge variant="secondary">Active</Badge>
              )}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Weight Adjustment Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Forecast Weights
          </CardTitle>
          <CardDescription>
            Balance between recent transaction trends and historical payout averages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recommended Settings Alert */}
          <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <div className="font-semibold text-sm">Recommended for {payoutFrequency === "daily" ? "Daily" : "Bi-weekly"} Payouts</div>
              <div className="text-sm text-muted-foreground">{recommended.description}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{recommended.transaction}% Transactions</Badge>
                <Badge variant="outline">{recommended.payout}% Payout History</Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => setTransactionWeight([recommended.transaction])}
              >
                Apply Recommended
              </Button>
            </div>
          </div>

          {/* Weight Slider */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Transaction Trend Weight</Label>
                <span className="text-2xl font-bold text-primary">{transactionWeight[0]}%</span>
              </div>
              <Slider
                value={transactionWeight}
                onValueChange={setTransactionWeight}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>More Payout History</span>
                <span>More Transaction Data</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Payout History Weight</Label>
                <span className="text-2xl font-bold text-secondary">{payoutWeight}%</span>
              </div>
              <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-secondary transition-all duration-300"
                  style={{ width: `${payoutWeight}%` }}
                />
              </div>
            </div>
          </div>

          {/* Weight Explanation */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <div className="font-semibold text-sm flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                Transaction Trends
              </div>
              <p className="text-xs text-muted-foreground">
                Uses recent sales velocity and order patterns to predict future payouts. Better for volatile or growing businesses.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-sm flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-secondary" />
                Payout History
              </div>
              <p className="text-xs text-muted-foreground">
                Uses your actual payout amounts from the past months. Better for stable businesses with consistent sales.
              </p>
            </div>
          </div>

          <Button 
            onClick={handleSaveSettings} 
            disabled={isSaving}
            className="w-full"
            size="lg"
          >
            {isSaving ? 'Saving & Regenerating...' : 'Save Settings & Regenerate Forecasts'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Forecast Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-accent/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Payout Schedule</div>
              <div className="text-xl font-bold capitalize">{payoutFrequency}</div>
            </div>
            <div className="text-center p-4 bg-accent/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Transaction Weight</div>
              <div className="text-xl font-bold text-primary">{transactionWeight[0]}%</div>
            </div>
            <div className="text-center p-4 bg-accent/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">History Weight</div>
              <div className="text-xl font-bold text-secondary">{payoutWeight}%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeightedForecasts;
