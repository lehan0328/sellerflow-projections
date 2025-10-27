import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sparkles, TrendingUp, Info, AlertTriangle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const ForecastSettings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { amazonAccounts } = useAmazonAccounts();
  const { amazonPayouts, refetch: refetchPayouts } = useAmazonPayouts();
  
  // Check if we're on the AI Forecast page
  const isOnForecastPage = window.location.pathname === '/ai-forecast';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(8); // Working value (can be changed)
  const [savedConfidenceThreshold, setSavedConfidenceThreshold] = useState(8); // Saved value (only changes after save)
  const [forecastsEnabled, setForecastsEnabled] = useState(true);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [togglingForecast, setTogglingForecast] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [advancedModelingEnabled, setAdvancedModelingEnabled] = useState(false);
  
  const hasAmazonStore = amazonAccounts && amazonAccounts.length > 0;
  
  // Check if any Amazon account is less than 3 hours old
  const newestAmazonAccount = useMemo(() => {
    if (!amazonAccounts || amazonAccounts.length === 0) return null;
    return amazonAccounts.reduce((newest, account) => {
      const accountDate = new Date(account.created_at);
      const newestDate = newest ? new Date(newest.created_at) : new Date(0);
      return accountDate > newestDate ? account : newest;
    }, amazonAccounts[0]);
  }, [amazonAccounts]);
  
  const amazonAccountAge = useMemo(() => {
    if (!newestAmazonAccount) return Infinity;
    return (Date.now() - new Date(newestAmazonAccount.created_at).getTime()) / (1000 * 60 * 60); // in hours
  }, [newestAmazonAccount]);
  
  // Always allow forecast toggle if Amazon account exists
  const canEnableForecasts = hasAmazonStore;
  const hoursUntilForecastAvailable = Math.max(0, Math.ceil(3 - amazonAccountAge));
  const [payoutModel, setPayoutModel] = useState<'bi-weekly' | 'daily'>('bi-weekly');
  
  // Check if user has 3+ confirmed payouts for advanced modeling
  const confirmedPayouts = amazonPayouts.filter(p => p.status === 'confirmed');
  const hasEnoughDataForAdvanced = confirmedPayouts.length >= 3;
  
  // Use the payout frequency from the user's Amazon account settings instead of auto-detecting
  const userSelectedPayoutModel = useMemo(() => {
    // Get payout frequency from the first active Amazon account
    const activeAccount = amazonAccounts?.find(acc => acc.is_active);
    return activeAccount?.payout_frequency || 'bi-weekly';
  }, [amazonAccounts]);

  // Sync payoutModel with userSelectedPayoutModel whenever it changes
  useEffect(() => {
    if (userSelectedPayoutModel) {
      console.log('🔄 Syncing payout model to:', userSelectedPayoutModel);
      setPayoutModel(userSelectedPayoutModel);
    }
  }, [userSelectedPayoutModel]);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('forecast_confidence_threshold, forecasts_enabled, advanced_modeling_enabled, default_reserve_lag_days')
        .eq('user_id', user!.id)
        .maybeSingle();

      console.log('🔍 Fetched settings:', data);
      
      // Use the payout frequency from user's Amazon account settings
      if (amazonAccounts && amazonAccounts.length > 0) {
        const firstAccount = amazonAccounts[0] as any;
        const currentModel = firstAccount.payout_frequency || 'bi-weekly';
        
        console.log('🔍 Using payout model from account settings:', currentModel);
        setPayoutModel(currentModel);
      }

      if (error && error.code !== 'PGRST116') throw error;

      // Default to Moderate (8) for all accounts until changed
      if (data?.forecast_confidence_threshold !== null && data?.forecast_confidence_threshold !== undefined) {
        console.log('📊 Loaded forecast risk level from database:', data.forecast_confidence_threshold);
        const loadedValue = data.forecast_confidence_threshold;
        setConfidenceThreshold(loadedValue);
        setSavedConfidenceThreshold(loadedValue); // Set both working and saved values
        console.log('📊 State set to:', loadedValue, 'Safety Net:', getSafetyLevel(loadedValue).label);
      } else {
        // No setting exists yet, default to Moderate (8)
        console.log('📊 No existing setting, defaulting to Moderate (8)');
        setConfidenceThreshold(8);
        setSavedConfidenceThreshold(8);
      }

      // Set forecast enabled state
      setForecastsEnabled(data?.forecasts_enabled ?? true);
      setAdvancedModelingEnabled(data?.advanced_modeling_enabled ?? false);
    } catch (error) {
      console.error('Error fetching forecast settings:', error);
      // On error, default to 8 (Moderate)
      setConfidenceThreshold(8);
      setForecastsEnabled(true);
    } finally {
      setLoading(false);
    }
  };

   const handleToggleForecast = async (enabled: boolean) => {
    setTogglingForecast(true);
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Not authenticated");

      // If enabling, just verify Amazon account exists
      if (enabled) {
        const { data: amazonAccounts } = await supabase
          .from('amazon_accounts')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('is_active', true);

        if (!amazonAccounts || amazonAccounts.length === 0) {
          toast.error("Connect an Amazon account before enabling forecasts");
          setTogglingForecast(false);
          return;
        }
      }

      console.log('🔄 [TOGGLE] Starting toggle to:', enabled, '| User ID:', currentUser.id);
      setSyncProgress(10);

      // Get current profile for account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', currentUser.id)
        .single();
      
      console.log('👤 [TOGGLE] Profile account_id:', profile?.account_id);

      // CRITICAL: Update forecasts_enabled BEFORE generating forecasts
      console.log('💾 [TOGGLE] Attempting database update...');
      const { data: updateData, error: updateError } = await supabase
        .from('user_settings')
        .update({ 
          forecasts_enabled: enabled,
          updated_at: new Date().toISOString() // Force timestamp update
        })
        .eq('user_id', currentUser.id)
        .select('forecasts_enabled, account_id')
        .single();

      console.log('📦 [TOGGLE] Update response:', { updateData, updateError });

      if (updateError) {
        console.error('❌ [TOGGLE] Failed to update forecasts_enabled:', updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }
      
      if (!updateData) {
        console.error('❌ [TOGGLE] No data returned from update');
        throw new Error('Update succeeded but no data returned - check RLS policies');
      }
      
      console.log('✅ [TOGGLE] Database updated successfully:', updateData);
      setSyncProgress(20);

      // Verify the update actually persisted with a fresh query
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for DB to settle
      const { data: verifyData, error: verifyError } = await supabase
        .from('user_settings')
        .select('forecasts_enabled, account_id, updated_at')
        .eq('user_id', currentUser.id)
        .single();
      
      console.log('🔍 [TOGGLE] Verification query:', { verifyData, verifyError });
      
      if (verifyError) {
        console.error('❌ [TOGGLE] Verification query failed:', verifyError);
        throw new Error(`Verification failed: ${verifyError.message}`);
      }
      
      if (!verifyData) {
        console.error('❌ [TOGGLE] No settings found for user');
        throw new Error('User settings not found - may need to be created first');
      }
      
      if (verifyData.forecasts_enabled !== enabled) {
        console.error('❌ [TOGGLE] Value mismatch after update!', {
          expected: enabled,
          actual: verifyData.forecasts_enabled,
          fullData: verifyData
        });
        throw new Error(`Setting did not persist: expected ${enabled}, got ${verifyData.forecasts_enabled}`);
      }
      
      console.log('✅ [TOGGLE] Verified value in DB matches expected:', verifyData);

      setForecastsEnabled(enabled);
      
      // Invalidate queries to ensure UI components refresh immediately
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['amazon-payouts'] });
      
      setSyncProgress(30);

      if (!enabled) {
        // Delete all forecasted payouts when disabled
        setSyncProgress(50);
        await supabase
          .from('amazon_payouts')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('status', 'forecasted');
        
        setSyncProgress(80);
        await refetchPayouts();
        setSyncProgress(100);
        toast.success("Forecasts disabled and removed");
      } else {
        // Automatically regenerate forecasts when enabled
        const loadingToastId = `forecast-generation-${Date.now()}`;
        toast.loading("Starting forecast generation...", { id: loadingToastId });
        setSyncProgress(40);
        
        try {
          // CRITICAL: Delete ALL old forecasts FIRST before generating new ones
          console.log('🗑️ [TOGGLE] Deleting old forecasts before generation...');
          const { error: deleteError } = await supabase
            .from('amazon_payouts')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('status', 'forecasted');
          
          if (deleteError) {
            console.error('❌ [TOGGLE] Failed to delete old forecasts:', deleteError);
          } else {
            console.log('✅ [TOGGLE] Old forecasts deleted');
          }
          
          setSyncProgress(45);
          
          // Generate new forecasts using mathematical model
          console.log('🔄 [TOGGLE] Calling forecast generation edge function...');
          const { data, error } = await supabase.functions.invoke('forecast-amazon-payouts', {
            body: { userId: currentUser.id }
          });

          console.log('📨 [TOGGLE] Edge function response:', { data, error });

          if (error) {
            toast.dismiss(loadingToastId);
            console.error('❌ [TOGGLE] Forecast generation error:', error);
            toast.error(`Forecast generation failed: ${error.message || 'Unknown error'}. Use Regenerate button to try again.`);
            setSyncProgress(0);
            return;
          }

          console.log('📊 [TOGGLE] Starting forecast polling...');
          setSyncProgress(50);

          // Poll for NEW forecasts to appear in the database
          // Wait at least 3 seconds before first check to let edge function start
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          let forecastsFound = false;
          let attempts = 0;
          const maxAttempts = 20; // 20 attempts * 2 seconds = 40 seconds max
          
          while (!forecastsFound && attempts < maxAttempts) {
            attempts++;
            const progressPercent = 50 + (attempts / maxAttempts) * 30; // 50-80%
            setSyncProgress(progressPercent);
            toast.loading(`Waiting for forecasts (${attempts}/${maxAttempts})...`, { id: loadingToastId });
            console.log(`🔍 Polling for forecasts (attempt ${attempts}/${maxAttempts})...`);
            
            // Wait 2 seconds between checks
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if NEW forecasts exist (created in last 2 minutes)
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            const { data: forecasts, error: fetchError } = await supabase
              .from('amazon_payouts')
              .select('id, created_at')
              .eq('user_id', currentUser.id)
              .eq('status', 'forecasted')
              .gte('created_at', twoMinutesAgo)
              .limit(1);
            
            console.log(`🔍 [TOGGLE] Poll ${attempts}/${maxAttempts}: Found ${forecasts?.length || 0} NEW forecasts`);
            
            if (fetchError) {
              console.error('❌ [TOGGLE] Error checking for forecasts:', fetchError);
              toast.dismiss(loadingToastId);
              toast.error(`Permission error: ${fetchError.message}. Check RLS policies on amazon_payouts table.`);
              setSyncProgress(0);
              setTogglingForecast(false);
              return;
            }
            
            if (forecasts && forecasts.length > 0) {
              forecastsFound = true;
              console.log('✅ [TOGGLE] NEW forecasts found in database!', forecasts);
              break;
            }
          }
          
          toast.dismiss(loadingToastId);
          
          if (forecastsFound) {
            setSyncProgress(90);
            await refetchPayouts();
            await fetchSettings();
            setSyncProgress(100);
            toast.success("Forecasts generated using spec-based calculations!", {
              description: "Using bi-weekly settlement cycle with 7-day reserve lag per Amazon Forecasting Spec v2"
            });
            
            // Auto-refresh to ensure all charts and components show the new forecasts
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            console.warn('⚠️ Forecast generation completed but forecasts not visible. Checking edge function response:', data);
            setSyncProgress(0);
            toast.error("Forecasts generated but not visible. This may be an RLS permission issue. Check the console for details.");
          }
        } catch (err) {
          toast.dismiss(loadingToastId);
          console.error('❌ Unexpected error:', err);
          toast.error("An error occurred while generating forecasts. Use the Regenerate button to try again.");
          setSyncProgress(0);
        }
      }
      
      // Refetch settings to ensure UI is in sync
      await fetchSettings();
      
      // Small delay to ensure realtime updates propagate
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error toggling forecasts:', error);
      toast.error("Failed to update forecast settings");
      // Revert on error
      setForecastsEnabled(!enabled);
      
      // Invalidate queries to ensure UI reflects correct state
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      
      setSyncProgress(0);
    } finally {
      setTogglingForecast(false);
      // Reset progress after a brief delay
      setTimeout(() => setSyncProgress(0), 1000);
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
      toast.success("Mathematical forecasts disabled. All forecasted payouts removed.");
      
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
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ Auth error:', userError);
        throw new Error("Authentication error: " + userError.message);
      }
      if (!currentUser) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        throw new Error("Failed to fetch profile: " + profileError.message);
      }

      if (!profile?.account_id) {
        console.error('❌ No account_id found in profile:', profile);
        throw new Error("Account not found. Please contact support.");
      }

      console.log('✅ Found account_id:', profile.account_id);

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

      console.log('💾 Current DB value:', existing?.forecast_confidence_threshold, '| Saving:', confidenceThreshold, forecastsEnabled);
      
      if (!existing) {
        console.log('📝 Inserting new record');
        const { data: insertedData, error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: currentUser.id,
            account_id: profile.account_id,
            forecast_confidence_threshold: confidenceThreshold,
            forecasts_enabled: forecastsEnabled,
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
          .update({ 
            forecast_confidence_threshold: confidenceThreshold,
            forecasts_enabled: forecastsEnabled
          })
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
      
      // Update saved value after successful save
      setSavedConfidenceThreshold(confidenceThreshold);

      // Handle forecasts based on enabled state
      if (!forecastsEnabled) {
        // Delete all forecasted payouts when disabled
        console.log('🗑️ Forecasts disabled, deleting forecasted payouts...');
        const { error: deleteError } = await supabase
          .from('amazon_payouts')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('status', 'forecasted');

        if (deleteError) {
          console.error('❌ Error deleting forecasts:', deleteError);
          toast.error("Settings saved but failed to remove forecasted payouts");
        } else {
          console.log('✅ Forecasts deleted');
          toast.success("Forecast settings saved - forecasts disabled");
        }
      } else {
        // Automatically regenerate forecasts
        console.log('🔄 Starting forecast regeneration...');
        const loadingToastId = `forecast-save-${Date.now()}`;
        toast.loading("Regenerating forecasts...", { id: loadingToastId });
        
        try {
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
            toast.dismiss(loadingToastId);
            console.error('❌ Forecast regeneration error:', error);
            toast.error(`Forecast regeneration failed: ${error.message || 'Unknown error'}`);
            return;
          }

          // Poll for forecasts to appear in the database
          let forecastsFound = false;
          let attempts = 0;
          const maxAttempts = 15; // 15 attempts * 2 seconds = 30 seconds max
          
          while (!forecastsFound && attempts < maxAttempts) {
            attempts++;
            toast.loading(`Waiting for forecasts (${attempts}/${maxAttempts})...`, { id: loadingToastId });
            console.log(`🔍 Polling for forecasts (attempt ${attempts}/${maxAttempts})...`);
            
            // Wait 2 seconds between checks
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if forecasts exist
            const { data: forecasts, error: fetchError } = await supabase
              .from('amazon_payouts')
              .select('id')
              .eq('user_id', currentUser.id)
              .eq('status', 'forecasted')
              .limit(1);
            
            if (fetchError) {
              console.error('❌ Error checking for forecasts:', fetchError);
              continue;
            }
            
            if (forecasts && forecasts.length > 0) {
              forecastsFound = true;
              console.log('✅ Forecasts found in database!');
              break;
            }
          }
          
          toast.dismiss(loadingToastId);
          
          if (forecastsFound) {
            console.log('✅ Forecasts regenerated successfully');
            await refetchPayouts();
            await fetchSettings();
            toast.success("Settings saved and forecasts updated!");
          } else {
            toast.error("Forecast generation timed out. Please try again.");
          }
        } catch (err) {
          toast.dismiss(loadingToastId);
          console.error('❌ Unexpected error during regeneration:', err);
          toast.error("An error occurred during forecast regeneration");
        }
      }
      
      // Refetch settings to update UI state
      await fetchSettings();
      
      // Refresh payout data to show updated data
      await refetchPayouts();
    } catch (error) {
      console.error('❌ Error saving forecast settings:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save settings";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getSafetyLevel = (value: number) => {
    if (value === 15) return { label: "Conservative (Safe)", color: "bg-emerald-500", index: 2, discount: "−15%" };
    if (value === 8) return { label: "Moderate (Balanced)", color: "bg-blue-500", index: 1, discount: "−8%" };
    return { label: "Aggressive (Fast Cycle)", color: "bg-orange-500", index: 0, discount: "−3%" };
  };

  const tiers = [
    { 
      value: 3, 
      label: "Aggressive", 
      color: "bg-orange-500", 
      recommended: false, 
      subtitle: "Fast Cycle (−3%)",
      hint: "Minimal buffer - best for stable sales with low returns and chargebacks."
    },
    { 
      value: 8, 
      label: "Moderate", 
      color: "bg-blue-500", 
      recommended: true, 
      subtitle: "Balanced (−8%)",
      hint: "Balanced protection - accounts for typical reserve delays and return rates."
    },
    { 
      value: 15, 
      label: "Conservative", 
      color: "bg-emerald-500", 
      recommended: false, 
      subtitle: "Safe (−15%)",
      hint: "Maximum safety net - best for volatile sales or high return categories."
    }
  ];

  const safetyLevel = getSafetyLevel(confidenceThreshold);
  const savedSafetyLevel = getSafetyLevel(savedConfidenceThreshold); // For "Current" display

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
              <CardTitle>Mathematical Forecast Settings</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {!isOnForecastPage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/ai-forecast')}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  View Advanced Forecast
                </Button>
              )}
              {forecastsEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setSyncProgress(10);
                    toast.loading("Regenerating forecasts...");
                    try {
                      const { data: { user: currentUser } } = await supabase.auth.getUser();
                      if (!currentUser) throw new Error("Not authenticated");
                      
                      setSyncProgress(30);
                      // Delete old forecasts
                      await supabase
                        .from('amazon_payouts')
                        .delete()
                        .eq('user_id', currentUser.id)
                        .eq('status', 'forecasted');
                      
                      setSyncProgress(50);
                      // Generate new forecasts
                      const { error } = await supabase.functions.invoke('forecast-amazon-payouts-math', {
                        body: { userId: currentUser.id }
                      });
                      
                      if (error) throw error;
                      
                      setSyncProgress(80);
                      await refetchPayouts();
                      setSyncProgress(100);
                      toast.dismiss();
                      toast.success("Forecasts regenerated successfully!");
                      setTimeout(() => setSyncProgress(0), 500);
                    } catch (error) {
                      console.error("Regeneration error:", error);
                      toast.dismiss();
                      toast.error("Failed to regenerate forecasts");
                      setSyncProgress(0);
                    }
                  }}
                  disabled={togglingForecast || syncProgress > 0}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="forecast-toggle" className="text-sm">
                        Mathematical Forecasts {(forecastsEnabled && hasAmazonStore) ? 'Enabled' : 'Disabled'}
                      </Label>
                      <Switch
                        id="forecast-toggle"
                        checked={forecastsEnabled && hasAmazonStore && canEnableForecasts}
                        onCheckedChange={handleToggleForecast}
                        disabled={togglingForecast || !hasAmazonStore || !canEnableForecasts}
                      />
                    </div>
                  </TooltipTrigger>
                  {!hasAmazonStore ? (
                    <TooltipContent>
                      <p>Connect an Amazon account to enable forecasting</p>
                    </TooltipContent>
                  ) : !canEnableForecasts ? (
                    <TooltipContent>
                      <p>Forecast available in {hoursUntilForecastAvailable} hours</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        3-hour data collection period required
                      </p>
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              </TooltipProvider>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/20">
                Mathematical
              </Badge>
            </div>
          </div>
           {syncProgress > 0 && syncProgress < 100 && (
            <div className="mt-3 space-y-2">
              <Progress value={syncProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {syncProgress < 40 ? 'Updating settings...' : 
                 syncProgress < 60 ? 'Generating forecasts...' : 
                 syncProgress < 90 ? 'Waiting for sync...' : 'Finalizing...'}
              </p>
            </div>
          )}
          <CardDescription>
            {forecastsEnabled && canEnableForecasts ? (
              <div className="space-y-2">
                <div>Adjust the conservatism of your Amazon payout forecasts</div>
                {!loading && (
                  <div className="text-xs text-muted-foreground">
                    Current safety net: <span className="font-semibold">{savedSafetyLevel.label} {savedSafetyLevel.discount}</span>
                  </div>
                )}
              </div>
            ) : !canEnableForecasts ? (
              <div className="mt-2 space-y-1">
                <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Forecasts will be available in {hoursUntilForecastAvailable} hours
                </div>
                <div className="text-xs text-muted-foreground">
                  We need 3 hours to collect enough Amazon data for accurate forecasting
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Mathematical forecasts are currently disabled
                </p>
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
                  {userSelectedPayoutModel && (
                    <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-xs text-green-800 dark:text-green-200 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Using your selected payout schedule: <span className="font-semibold">{userSelectedPayoutModel === 'bi-weekly' ? '14-Day Settlements' : 'Daily Available'}</span>
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2 block">
                      Forecast Model {userSelectedPayoutModel ? '(From Account Settings)' : ''}
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          userSelectedPayoutModel === 'bi-weekly'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 opacity-50'
                        }`}
                      >
                        <div className="font-semibold">14-Day Settlements</div>
                        <div className="text-[10px] opacity-80">Standard bi-weekly</div>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          userSelectedPayoutModel === 'daily'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 opacity-50'
                        }`}
                      >
                        <div className="font-semibold">Daily Available</div>
                        <div className="text-[10px] opacity-80">Withdrawable funds</div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                      Change your payout schedule in Amazon Account Settings
                    </p>
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
              <Label htmlFor="safety-net">Safety Net Level</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Amazon payouts fluctuate due to reserves, returns, and settlement delays. 
                      Choose a safety level to discount forecasted payouts by a buffer so your available cash stays conservative.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Saved:</span>
              <Badge className={savedSafetyLevel.color}>
                {savedSafetyLevel.label}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">{savedSafetyLevel.discount}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {tiers.map((tier) => (
              <button
                key={tier.value}
                type="button"
                onClick={() => {
                  console.log('🎯 Selected tier:', tier.label, 'Value:', tier.value);
                  setConfidenceThreshold(tier.value);
                }}
                className={`p-4 rounded-lg border-2 transition-all relative ${
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
                <div className="text-sm font-medium mb-1">{tier.label}</div>
                <div className="text-[10px] text-muted-foreground mb-2">{tier.subtitle}</div>
                <div className="text-[9px] text-muted-foreground italic line-clamp-2">{tier.hint}</div>
                {savedConfidenceThreshold === tier.value && confidenceThreshold !== tier.value && (
                  <div className="absolute top-1 left-1">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      Saved
                    </Badge>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            Safety Net Impact on Forecasts:
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
            <li><strong>Aggressive (−3%):</strong> Use when settlement cycles are 1–1.5 days and returns are low</li>
            <li><strong>Moderate (−8%):</strong> Use when settlement cycles are ~2 days and payouts are steady (Recommended)</li>
            <li><strong>Conservative (−15%):</strong> Use when settlement cycles are 3+ days or payouts are volatile</li>
            <li>Safety buffer is applied to raw forecasts: Adjusted Payout = Raw Forecast × (1 − discount%)</li>
          </ul>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !forecastsEnabled || confidenceThreshold === savedConfidenceThreshold}
                  className="w-full"
                >
                  {saving ? "Saving..." : confidenceThreshold === savedConfidenceThreshold ? "No Changes to Save" : "Save Forecast Settings"}
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
                <p>Enable mathematical forecasts to adjust settings</p>
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
            Disable Mathematical Forecasts?
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
              You can re-enable mathematical forecasts anytime from the settings.
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

    {/* Loading Dialog - Blocks UI while toggling forecast */}
    <Dialog open={togglingForecast} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideClose>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Processing Changes
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-4">
            <p className="text-base font-medium">Please wait while we update your forecast settings...</p>
            <p className="text-sm text-muted-foreground">
              This process may take a few moments. Please do not close this window or navigate away.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating forecasts and recalculating projections...</span>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
    </>
  );
};
