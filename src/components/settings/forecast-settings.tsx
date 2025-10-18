import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sparkles, TrendingUp, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const ForecastSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { amazonAccounts } = useAmazonAccounts();
  const { amazonPayouts, refetch: refetchPayouts } = useAmazonPayouts();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(5); // -5 = Aggressive, 0 = Medium, 5 = Safe, 10 = Very Safe
  const [forecastsEnabled, setForecastsEnabled] = useState(true);
  const [disabledAt, setDisabledAt] = useState<string | null>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [togglingForecast, setTogglingForecast] = useState(false);
  const [advancedModelingEnabled, setAdvancedModelingEnabled] = useState(false);
  
  const hasAmazonStore = amazonAccounts && amazonAccounts.length > 0;
  const [payoutModel, setPayoutModel] = useState<'bi-weekly' | 'daily'>('bi-weekly');
  
  // Check if user has 3+ confirmed payouts for advanced modeling
  const confirmedPayouts = amazonPayouts.filter(p => p.status === 'confirmed');
  const hasEnoughDataForAdvanced = confirmedPayouts.length >= 3;

  // Calculate if 24 hours have passed since disabling
  const canReEnable = !disabledAt || 
    (new Date().getTime() - new Date(disabledAt).getTime()) >= 24 * 60 * 60 * 1000;
  
  const hoursUntilReEnable = disabledAt 
    ? Math.max(0, 24 - Math.floor((new Date().getTime() - new Date(disabledAt).getTime()) / (60 * 60 * 1000)))
    : 0;

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('forecast_confidence_threshold, forecasts_enabled, forecasts_disabled_at, advanced_modeling_enabled, default_reserve_lag_days')
        .eq('user_id', user!.id)
        .maybeSingle();

      console.log('🔍 Fetched settings:', data);
      
      // Load Amazon account payout model
      if (amazonAccounts && amazonAccounts.length > 0) {
        const firstAccount = amazonAccounts[0] as any;
        setPayoutModel(firstAccount.payout_model || 'bi-weekly');
      }

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

      // Set forecast enabled state
      setForecastsEnabled(data?.forecasts_enabled ?? true);
      setDisabledAt(data?.forecasts_disabled_at || null);
      setAdvancedModelingEnabled(data?.advanced_modeling_enabled ?? false);
    } catch (error) {
      console.error('Error fetching forecast settings:', error);
      // On error, default to 5 (Safe)
      setConfidenceThreshold(5);
      setForecastsEnabled(true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleForecast = async (enabled: boolean) => {
    if (!enabled) {
      // Show confirmation dialog before disabling
      setShowDisableConfirm(true);
      return;
    }

    // Check if 24 hours have passed
    if (!canReEnable) {
      toast.error(`You can re-enable forecasts in ${hoursUntilReEnable} hours`);
      return;
    }

    // Re-enable forecasts
    setTogglingForecast(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!profile?.account_id) throw new Error("Account not found");

      const { error: updateError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: currentUser.id,
          account_id: profile.account_id,
          forecasts_enabled: true,
          forecasts_disabled_at: null,
          forecast_confidence_threshold: confidenceThreshold
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      setForecastsEnabled(true);
      setDisabledAt(null);
      toast.success("AI forecasts re-enabled");
      
      // Regenerate forecasts
      await handleSave();
      
      // Refresh payout data to show new forecasts
      refetchPayouts();
    } catch (error) {
      console.error('Error enabling forecasts:', error);
      toast.error("Failed to enable forecasts");
    } finally {
      setTogglingForecast(false);
    }
  };

  const confirmDisableForecast = async () => {
    setShowDisableConfirm(false);
    setTogglingForecast(true);
    
    try {
      console.log('[DISABLE] Calling disable-forecasts function...');
      const { error } = await supabase.functions.invoke('disable-forecasts');

      if (error) {
        console.error('[DISABLE] Error:', error);
        throw error;
      }

      setForecastsEnabled(false);
      setDisabledAt(new Date().toISOString());
      toast.success("AI forecasts disabled. All forecasted payouts removed.");
      
      // Reload to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error disabling forecasts:', error);
      toast.error("Failed to disable forecasts");
    } finally {
      setTogglingForecast(false);
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

      // Update Amazon account payout model (DD+7 is standard)
      if (amazonAccounts && amazonAccounts.length > 0) {
        for (const account of amazonAccounts) {
          await supabase
            .from('amazon_accounts')
            .update({
              payout_model: payoutModel,
              reserve_lag_days: 7 // DD+7 standard
            })
            .eq('id', account.id);
        }
      }

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
            default_reserve_lag_days: 7, // DD+7 standard
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

      // Generate new forecasts using mathematical model
      console.log('🤖 Calling forecast-amazon-payouts-math function...');
      const { data, error } = await supabase.functions.invoke('forecast-amazon-payouts-math', {
        body: { userId: currentUser.id }
      });

      console.log('📊 Forecast response:', { data, error });

      if (error) {
        console.error('❌ Forecast regeneration error:', error);
        toast.error("Settings saved but forecast regeneration failed");
      } else if (data?.success) {
        console.log('✅ Forecasts regenerated successfully');
        toast.success("Settings saved and forecasts updated!");
        
        // Refresh payout data to show new forecasts immediately
        refetchPayouts();
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle>AI Forecast Settings</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/ai-forecast')}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                View AI Forecast
              </Button>
              <div className="flex items-center gap-2">
                <Label htmlFor="forecast-toggle" className="text-sm">
                  AI Forecasts {forecastsEnabled ? 'Enabled' : 'Disabled'}
                </Label>
                <Switch
                  id="forecast-toggle"
                  checked={forecastsEnabled}
                  onCheckedChange={handleToggleForecast}
                  disabled={togglingForecast || !hasAmazonStore || (!forecastsEnabled && !canReEnable)}
                />
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/20">
                AI-Powered
              </Badge>
            </div>
          </div>
          <CardDescription>
            {forecastsEnabled ? (
              <>
                Adjust the conservatism of your Amazon payout forecasts
                {!loading && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Current forecast risk: <span className="font-semibold">{riskLevel.label}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  AI forecasts are currently disabled
                </p>
                {!canReEnable && (
                  <p className="text-xs text-muted-foreground">
                    You can re-enable forecasts in {hoursUntilReEnable} hours
                  </p>
                )}
              </div>
            )}
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-6">
        {!forecastsEnabled && (
          <div className="rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-4">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              All AI-forecasted Amazon payouts have been removed from your cash flow projections. 
              Only confirmed payouts will be shown.
            </p>
          </div>
        )}
        
        <div className="space-y-4" style={{ opacity: forecastsEnabled ? 1 : 0.5, pointerEvents: forecastsEnabled ? 'auto' : 'none' }}>
          {/* Mathematical Forecasting Model Selection */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Mathematical Payout Forecasting
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                  Using delivery-based reserve modeling (DD+7) with per-order net cash calculations, 
                  Amazon fee structures, return rates, and chargeback modeling.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2 block">
                      Forecast Model
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPayoutModel('bi-weekly')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          payoutModel === 'bi-weekly'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold">14-Day Settlements</div>
                        <div className="text-[10px] opacity-80">Standard bi-weekly</div>
                      </button>
                      <button
                        onClick={() => setPayoutModel('daily')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          payoutModel === 'daily'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold">Daily Available</div>
                        <div className="text-[10px] opacity-80">Withdrawable funds</div>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
                          DD+7 Reserve Policy
                        </p>
                        <p className="text-[10px] text-amber-700 dark:text-amber-300">
                          Forecasts assume Amazon's standard 7-day reserve policy after delivery. 
                          <span className="font-medium"> Note: Forecasts may be less accurate if your account is under review or flagged as high-risk</span>, 
                          as Amazon may hold funds longer (DD+14 or DD+21).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-white/50 dark:bg-slate-900/50 rounded text-[10px] text-slate-600 dark:text-slate-400">
                  <p className="font-medium mb-1">Calculation Method:</p>
                  <p>
                    {payoutModel === 'bi-weekly' 
                      ? 'Payout = [Eligible in Period + Prior Balance + Adjustments] - Reserve(DD+7)'
                      : 'Daily Available = Eligible Cash - Account Reserve(DD+7) - Min Floor'}
                  </p>
                </div>
              </div>
            </div>
          </div>

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
                  disabled={saving || !hasAmazonStore || !forecastsEnabled}
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
            {!forecastsEnabled && (
              <TooltipContent>
                <p>Enable AI forecasts to adjust settings</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>

    <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Disable AI Forecasts?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left">
            <p>
              This will immediately:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Remove all AI-forecasted Amazon payouts from your cash flow projections</li>
              <li>Remove forecasts from all {amazonAccounts?.length || 0} connected Amazon account(s)</li>
              <li>Only show confirmed Amazon payouts going forward</li>
            </ul>
            <p className="font-semibold text-orange-600 dark:text-orange-400">
              You will need to wait 24 hours before you can re-enable AI forecasts.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDisableForecast}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Disable Forecasts
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
