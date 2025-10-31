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

interface WeightConfig {
  days30PayoutWeight: number;
  days60PayoutWeight: number;
  days90PayoutWeight: number;
}

const WeightedForecasts = () => {
  const { toast } = useToast();
  const { amazonPayouts } = useAmazonPayouts();
  const [payoutFrequency, setPayoutFrequency] = useState<PayoutFrequency>("daily");
  const [weights, setWeights] = useState<WeightConfig>({
    days30PayoutWeight: 75,
    days60PayoutWeight: 50,
    days90PayoutWeight: 25,
  });
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
        if (settings.weights) {
          setWeights({
            days30PayoutWeight: settings.weights.days30PayoutWeight ?? 75,
            days60PayoutWeight: settings.weights.days60PayoutWeight ?? 50,
            days90PayoutWeight: settings.weights.days90PayoutWeight ?? 25,
          });
        }
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
        weights: {
          days30PayoutWeight: weights.days30PayoutWeight,
          days60PayoutWeight: weights.days60PayoutWeight,
          days90PayoutWeight: weights.days90PayoutWeight,
        },
      };

      const { error } = await supabase
        .from('profiles')
        .update({ forecast_settings: settings })
        .eq('user_id', user.id);

      if (error) throw error;

      // Delete existing forecasts first
      console.log('Deleting existing forecasts...');
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.account_id) {
        const { error: deleteError } = await supabase
          .from('amazon_payouts')
          .delete()
          .eq('account_id', profile.account_id)
          .eq('status', 'forecasted');
        
        if (deleteError) {
          console.error('Error deleting forecasts:', deleteError);
        } else {
          console.log('Successfully deleted existing forecasts');
        }
      }

      // Trigger forecast regeneration with new weights
      console.log('Regenerating forecasts with custom weights:', settings.weights);
      const { data: forecastData, error: forecastError } = await supabase.functions.invoke('forecast-amazon-payouts', {
        body: { forceRegenerate: true, customWeights: settings.weights }
      });

      if (forecastError) {
        console.error('Forecast regeneration error:', forecastError);
        throw forecastError;
      }

      console.log('Forecast regeneration complete:', forecastData);

      toast({
        title: 'Settings saved',
        description: 'Your forecast weights have been updated and new forecasts generated with your custom weights.',
      });

      // Refresh the page to show new forecasts
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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

  const resetToDefaults = () => {
    setWeights({
      days30PayoutWeight: 75,
      days60PayoutWeight: 50,
      days90PayoutWeight: 25,
    });
  };

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
            Auto-detected from your Amazon payout history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 p-4 border-2 border-primary rounded-lg bg-primary/5">
            <div className="flex-1">
              <div className="font-semibold text-base capitalize">{payoutFrequency === "daily" ? "Daily Payouts" : "Bi-weekly Payouts"}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {payoutFrequency === "daily" 
                  ? "Your account receives payouts every 1-3 days" 
                  : "Your account receives payouts every 14 days"}
              </div>
            </div>
            <Badge variant="default" className="text-sm">Auto-Selected</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Weight Adjustment Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Forecast Weights by Time Span
            </div>
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
          </CardTitle>
          <CardDescription>
            Configure different weights for short-term, medium-term, and long-term forecasts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Default Configuration Info */}
          <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <div className="font-semibold text-sm">Default Configuration</div>
              <div className="text-sm text-muted-foreground">
                Newer accounts rely more on payout history (more predictable). As accounts age, transaction trends become more reliable indicators.
              </div>
            </div>
          </div>

          {/* 30 Day Weight */}
          <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">30 Day Forecast</Label>
                <p className="text-xs text-muted-foreground mt-1">Short-term prediction (0-30 days old accounts)</p>
              </div>
              <Badge variant="secondary" className="text-sm">Default: 75% / 25%</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Payout History Weight</Label>
                <span className="text-xl font-bold text-primary">{weights.days30PayoutWeight}%</span>
              </div>
              <Slider
                value={[weights.days30PayoutWeight]}
                onValueChange={(value) => setWeights({ ...weights, days30PayoutWeight: value[0] })}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transaction Trends: {100 - weights.days30PayoutWeight}%</span>
              </div>
            </div>
          </div>

          {/* 60 Day Weight */}
          <div className="space-y-4 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">60 Day Forecast</Label>
                <p className="text-xs text-muted-foreground mt-1">Medium-term prediction (30-60 days old accounts)</p>
              </div>
              <Badge variant="secondary" className="text-sm">Default: 50% / 50%</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Payout History Weight</Label>
                <span className="text-xl font-bold text-primary">{weights.days60PayoutWeight}%</span>
              </div>
              <Slider
                value={[weights.days60PayoutWeight]}
                onValueChange={(value) => setWeights({ ...weights, days60PayoutWeight: value[0] })}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transaction Trends: {100 - weights.days60PayoutWeight}%</span>
              </div>
            </div>
          </div>

          {/* 90+ Day Weight */}
          <div className="space-y-4 p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">90+ Day Forecast</Label>
                <p className="text-xs text-muted-foreground mt-1">Long-term prediction (60+ days old accounts)</p>
              </div>
              <Badge variant="secondary" className="text-sm">Default: 25% / 75%</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Payout History Weight</Label>
                <span className="text-xl font-bold text-primary">{weights.days90PayoutWeight}%</span>
              </div>
              <Slider
                value={[weights.days90PayoutWeight]}
                onValueChange={(value) => setWeights({ ...weights, days90PayoutWeight: value[0] })}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transaction Trends: {100 - weights.days90PayoutWeight}%</span>
              </div>
            </div>
          </div>

          {/* Weight Explanation */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <div className="font-semibold text-sm flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                Payout History
              </div>
              <p className="text-xs text-muted-foreground">
                Uses your actual payout amounts from the past months. More reliable for new accounts with limited transaction data.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-sm flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-secondary" />
                Transaction Trends
              </div>
              <p className="text-xs text-muted-foreground">
                Uses recent sales velocity and order patterns. Becomes more accurate as your account matures and patterns emerge.
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
              <div className="text-sm text-muted-foreground mb-1">Payout Schedule</div>
              <div className="text-xl font-bold capitalize">{payoutFrequency}</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="text-sm text-muted-foreground mb-1">30 Day</div>
              <div className="text-lg font-bold">{weights.days30PayoutWeight}% / {100 - weights.days30PayoutWeight}%</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
              <div className="text-sm text-muted-foreground mb-1">60 Day</div>
              <div className="text-lg font-bold">{weights.days60PayoutWeight}% / {100 - weights.days60PayoutWeight}%</div>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
              <div className="text-sm text-muted-foreground mb-1">90+ Day</div>
              <div className="text-lg font-bold">{weights.days90PayoutWeight}% / {100 - weights.days90PayoutWeight}%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeightedForecasts;
