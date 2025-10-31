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

      {/* Coming Soon Notice */}
      <Card className="border-2 border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Info className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Coming Soon: Advanced Weighted Forecasting</h3>
              <p className="text-muted-foreground mb-4">
                We're currently building out the transaction trend detection system that will power weighted forecasts. 
                For now, your forecasts use a simple 30-day payout average which provides the most reliable predictions based on your actual Amazon disbursements.
              </p>
              <p className="text-sm text-muted-foreground">
                Once we've collected enough transaction data and validated our trend detection algorithms, you'll be able to customize 
                forecast weights to blend historical payout patterns with real-time sales velocity for even more accurate predictions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Current Method Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Forecast Method</CardTitle>
          <CardDescription>Your forecasts are currently using the most reliable data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="font-semibold mb-2">30-Day Payout Average</div>
            <p className="text-sm text-muted-foreground">
              Forecasts are calculated using a simple 30-day average of your actual Amazon payouts. 
              This provides the most accurate and reliable predictions based on your confirmed disbursement history.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeightedForecasts;
