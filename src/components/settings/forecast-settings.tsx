import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const ForecastSettings = () => {
  const { user } = useAuth();
  const { amazonAccounts } = useAmazonAccounts();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(5); // -5 = Aggressive, 0 = Medium, 5 = Safe, 10 = Very Safe
  
  const hasAmazonStore = amazonAccounts && amazonAccounts.length > 0;

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

      console.log('🔍 Fetched settings:', data);

      if (error && error.code !== 'PGRST116') throw error;

      // If data exists and has a valid threshold, use it; otherwise keep default of 5 (Safe)
      if (data?.forecast_confidence_threshold !== null && data?.forecast_confidence_threshold !== undefined) {
        console.log('📊 Loaded forecast risk level from database:', data.forecast_confidence_threshold);
        const loadedValue = data.forecast_confidence_threshold;
        setConfidenceThreshold(loadedValue);
        console.log('📊 State set to:', loadedValue, 'Risk level:', getRiskLevel(loadedValue).label);
      } else {
        // No setting exists yet, keep default of 5 (Safe)
        console.log('📊 No existing setting, using default: 5 (Safe)');
        setConfidenceThreshold(5);
      }
    } catch (error) {
      console.error('Error fetching forecast settings:', error);
      // On error, default to 5 (Safe)
      setConfidenceThreshold(5);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    console.log('🔵 Starting save with value:', confidenceThreshold);
    
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
        .select('id, forecast_confidence_threshold')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      console.log('💾 Current DB value:', existing?.forecast_confidence_threshold, '| Saving:', confidenceThreshold);
      
      if (!existing) {
        console.log('📝 Inserting new record');
        const { data: insertedData, error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: currentUser.id,
            account_id: profile.account_id,
            forecast_confidence_threshold: confidenceThreshold,
          })
          .select('forecast_confidence_threshold')
          .single();
        
        if (insertError) {
          console.error('❌ Insert error:', insertError);
          throw insertError;
        }
        console.log('✅ Inserted value:', insertedData?.forecast_confidence_threshold);
      } else {
        console.log('📝 Updating existing record');
        const { data: updatedData, error: updateError } = await supabase
          .from('user_settings')
          .update({ forecast_confidence_threshold: confidenceThreshold })
          .eq('user_id', currentUser.id)
          .select('forecast_confidence_threshold')
          .single();
        
        if (updateError) {
          console.error('❌ Update error:', updateError);
          throw updateError;
        }
        console.log('✅ Updated value:', updatedData?.forecast_confidence_threshold);
      }

      // Verify the save by reading back
      const { data: verification } = await supabase
        .from('user_settings')
        .select('forecast_confidence_threshold')
        .eq('user_id', currentUser.id)
        .single();
      
      console.log('🔍 Verification - Value in DB after save:', verification?.forecast_confidence_threshold);
      
      if (verification?.forecast_confidence_threshold !== confidenceThreshold) {
        console.error('⚠️ WARNING: Saved value does not match! Expected:', confidenceThreshold, 'Got:', verification?.forecast_confidence_threshold);
        toast.error("Save verification failed - value mismatch!");
        return;
      }

      console.log('✅ Forecast risk level saved and verified:', confidenceThreshold);
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

  const getRiskLevel = (value: number) => {
    if (value === 10) return { label: "Very Safe", color: "bg-emerald-500", index: 3 };
    if (value === 5) return { label: "Safe", color: "bg-blue-500", index: 2 };
    if (value === 0) return { label: "Medium (Risky)", color: "bg-orange-500", index: 1 };
    return { label: "Aggressive Growth (Super Risky)", color: "bg-red-500", index: 0 };
  };

  const tiers = [
    { value: -5, label: "Aggressive Growth", color: "bg-red-500", recommended: false, subtitle: "Super Risky" },
    { value: 0, label: "Medium", color: "bg-orange-500", recommended: false, subtitle: "Risky" },
    { value: 5, label: "Safe", color: "bg-blue-500", recommended: true, subtitle: "Recommended" },
    { value: 10, label: "Very Safe", color: "bg-emerald-500", recommended: false, subtitle: "Conservative" }
  ];

  const riskLevel = getRiskLevel(confidenceThreshold);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle>AI Forecast Risk Level</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/20">
            AI-Powered
          </Badge>
        </div>
        <CardDescription>
          Adjust the conservatism of your Amazon payout forecasts
          {!loading && (
            <div className="mt-2 text-xs text-muted-foreground">
              Current saved value: <span className="font-mono font-semibold">{confidenceThreshold}</span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="risk-threshold">Forecast Risk Adjustment</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Aggressive (+5%), Medium (0%), Safe (-5%), Very Safe (-10%)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Current:</span>
              <Badge className={riskLevel.color}>
                {riskLevel.label}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">({confidenceThreshold})</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {tiers.map((tier) => (
              <button
                key={tier.value}
                type="button"
                onClick={() => {
                  console.log('🎯 Selected tier:', tier.label, 'Value:', tier.value);
                  setConfidenceThreshold(tier.value);
                }}
                className={`p-3 rounded-lg border-2 transition-all relative ${
                  confidenceThreshold === tier.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {tier.recommended && (
                  <Badge className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-0.5">
                    Recommended
                  </Badge>
                )}
                <div className={`w-3 h-3 rounded-full ${tier.color} mx-auto mb-2`} />
                <div className="text-xs font-medium">{tier.label}</div>
                <div className="text-[10px] text-muted-foreground">{tier.subtitle}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            How this affects your forecasts:
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
            <li><strong>Aggressive Growth (+5%):</strong> 5% increase on average - for rapidly growing businesses, highest risk</li>
            <li><strong>Medium (0%):</strong> Average of previous payouts - balanced but risky</li>
            <li><strong>Safe (-5%):</strong> 5% decrease on average - recommended conservative buffer</li>
            <li><strong>Very Safe (-10%):</strong> 10% decrease on average - maximum safety margin</li>
            <li>Forecasts apply to safe spending limits and buying opportunities</li>
          </ul>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !hasAmazonStore}
                  className="w-full"
                >
                  {saving ? "Saving..." : "Save Forecast Settings"}
                </Button>
              </div>
            </TooltipTrigger>
            {!hasAmazonStore && (
              <TooltipContent>
                <p>Connect an Amazon store to enable forecast settings</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
