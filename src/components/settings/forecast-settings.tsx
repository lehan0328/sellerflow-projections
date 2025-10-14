import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const ForecastSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forecastConfidence, setForecastConfidence] = useState(85);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('forecast_confidence_threshold')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.forecast_confidence_threshold) {
        setForecastConfidence(data.forecast_confidence_threshold);
      }
    } catch (error) {
      console.error('Error fetching forecast settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!profile?.account_id) throw new Error("Account not found");

      // Check if settings exist
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from('user_settings').insert({
          user_id: currentUser.id,
          account_id: profile.account_id,
          forecast_confidence_threshold: forecastConfidence,
        });
      } else {
        await supabase
          .from('user_settings')
          .update({ forecast_confidence_threshold: forecastConfidence })
          .eq('user_id', currentUser.id);
      }

      console.log('✅ Forecast confidence updated to:', forecastConfidence);
      toast.success("Forecast settings updated");

      // Automatically regenerate forecasts with the new confidence threshold
      console.log('🔄 Starting forecast regeneration...');
      toast.loading("Regenerating forecasts with new confidence threshold...");
      
      // Delete old forecasts
      const { error: deleteError } = await supabase
        .from('amazon_payouts')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('status', 'forecasted');

      if (deleteError) {
        console.error('❌ Error deleting old forecasts:', deleteError);
      } else {
        console.log('✅ Old forecasts deleted');
      }

      // Generate new forecasts
      console.log('🤖 Calling forecast-amazon-payouts function...');
      const { data, error } = await supabase.functions.invoke('forecast-amazon-payouts', {
        body: { userId: currentUser.id }
      });

      console.log('📊 Forecast response:', { data, error });

      if (error) {
        console.error('❌ Forecast regeneration error:', error);
        toast.error("Settings saved but forecast regeneration failed");
      } else if (data?.success) {
        console.log('✅ Forecasts regenerated successfully');
        toast.success("Settings saved and forecasts updated!");
        
        // Trigger a page reload to show new forecasts
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving forecast settings:', error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceLevel = (value: number) => {
    if (value === 100) return { label: "Maximum Safety", color: "bg-emerald-500" };
    if (value >= 90) return { label: "Very Conservative", color: "bg-green-500" };
    if (value >= 85) return { label: "Balanced", color: "bg-blue-500" };
    return { label: "Aggressive", color: "bg-orange-500" };
  };

  const confidenceLevel = getConfidenceLevel(forecastConfidence);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle>AI Forecast Settings</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/20">
            AI-Powered
          </Badge>
        </div>
        <CardDescription>
          Control how conservative or aggressive your Amazon payout forecasts should be
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="forecast-confidence">Forecast Confidence Threshold</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Higher values (90-95%) mean more conservative forecasts with tighter margins.
                      Lower values (80-85%) allow for more variation in predictions.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">{forecastConfidence}%</span>
              <Badge className={confidenceLevel.color}>
                {confidenceLevel.label}
              </Badge>
            </div>
          </div>

          <Slider
            id="forecast-confidence"
            name="forecast-confidence"
            min={80}
            max={100}
            step={1}
            value={[forecastConfidence]}
            onValueChange={(value) => setForecastConfidence(value[0])}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>80% (Aggressive)</span>
            <span>100% (Most Conservative)</span>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            How this affects your forecasts:
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
            <li>Higher confidence = more predictable buying opportunities</li>
            <li>AI will adjust forecast margins based on your threshold</li>
            <li>Amazon payouts are highly predictable (recommended: 85-100%)</li>
            <li>100% confidence shows only the safest predictions</li>
          </ul>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? "Saving..." : "Save Forecast Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};
