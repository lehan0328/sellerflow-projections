import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useUserSettings = () => {
  const [totalCash, setTotalCash] = useState(0);
  const [loading, setLoading] = useState(true);
  const [forecastsEnabled, setForecastsEnabled] = useState(false);
  const [chartPreferences, setChartPreferences] = useState({
    showCashFlowLine: true,
    showTotalResourcesLine: true,
    showCreditCardLine: true,
    showReserveLine: true,
    showForecastLine: false,
    cashFlowColor: 'hsl(221, 83%, 53%)',
    totalResourcesColor: '#10b981',
    creditCardColor: '#f59e0b',
    reserveColor: '#ef4444',
    forecastColor: '#a855f7',
  });
  const { toast } = useToast();

  const fetchUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // If no settings exist, create default settings
        await createDefaultSettings(user.id);
        return;
      }

      // Check if Amazon accounts are ready for forecasting
      const { data: amazonAccounts } = await supabase
        .from('amazon_accounts')
        .select('id, initial_sync_complete, transaction_count, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const hasAmazonAccount = amazonAccounts && amazonAccounts.length > 0;
      let canEnableForecasts = false;

      if (hasAmazonAccount) {
      // Check if any account meets the requirements:
      // 1. Has 50+ transactions (initial_sync_complete)
      // 2. Was created at least 24 hours ago
      const now = new Date();
      canEnableForecasts = amazonAccounts.some(acc => {
        const createdAt = new Date(acc.created_at);
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        return acc.initial_sync_complete && 
               (acc.transaction_count || 0) >= 50 && 
               hoursSinceCreation >= 24;
      });
    }

    // Use database value directly - trust the backend validation
    const actualForecastsEnabled = data.forecasts_enabled ?? false;

      setTotalCash(Number(data.total_cash));
      setForecastsEnabled(actualForecastsEnabled ?? false);
      
      // Load chart preferences if they exist
      setChartPreferences({
        showCashFlowLine: data.chart_show_cashflow_line ?? true,
        showTotalResourcesLine: data.chart_show_resources_line ?? true,
        showCreditCardLine: data.chart_show_credit_line ?? true,
        showReserveLine: data.chart_show_reserve_line ?? true,
        showForecastLine: data.chart_show_forecast_line ?? false,
        cashFlowColor: data.chart_cashflow_color ?? 'hsl(221, 83%, 53%)',
        totalResourcesColor: data.chart_resources_color ?? '#10b981',
        creditCardColor: data.chart_credit_color ?? '#f59e0b',
        reserveColor: data.chart_reserve_color ?? '#ef4444',
        forecastColor: data.chart_forecast_color ?? '#a855f7',
      });
    } catch (error: any) {
      console.error('Error fetching user settings:', error);
      // Don't show toast if user is simply not authenticated (signed out)
      if (error?.message !== 'User not authenticated') {
        toast({
          title: "Error",
          description: "Failed to load user settings",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateChartPreferences = async (preferences: Partial<typeof chartPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) {
        throw new Error('Account not found');
      }

      // Map preferences to database column names
      const dbUpdates: Record<string, any> = {};
      if (preferences.showCashFlowLine !== undefined) dbUpdates.chart_show_cashflow_line = preferences.showCashFlowLine;
      if (preferences.showTotalResourcesLine !== undefined) dbUpdates.chart_show_resources_line = preferences.showTotalResourcesLine;
      if (preferences.showCreditCardLine !== undefined) dbUpdates.chart_show_credit_line = preferences.showCreditCardLine;
      if (preferences.showReserveLine !== undefined) dbUpdates.chart_show_reserve_line = preferences.showReserveLine;
      if (preferences.showForecastLine !== undefined) dbUpdates.chart_show_forecast_line = preferences.showForecastLine;
      if (preferences.cashFlowColor !== undefined) dbUpdates.chart_cashflow_color = preferences.cashFlowColor;
      if (preferences.totalResourcesColor !== undefined) dbUpdates.chart_resources_color = preferences.totalResourcesColor;
      if (preferences.creditCardColor !== undefined) dbUpdates.chart_credit_color = preferences.creditCardColor;
      if (preferences.reserveColor !== undefined) dbUpdates.chart_reserve_color = preferences.reserveColor;
      if (preferences.forecastColor !== undefined) dbUpdates.chart_forecast_color = preferences.forecastColor;

      const { error } = await supabase
        .from('user_settings')
        .update(dbUpdates)
        .eq('user_id', user.id);

      if (error) throw error;

      setChartPreferences(prev => ({ ...prev, ...preferences }));
    } catch (error) {
      console.error('Error updating chart preferences:', error);
    }
  };

  const createDefaultSettings = async (userId: string) => {
    try {
      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile?.account_id) {
        throw new Error('Account not found');
      }

      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          account_id: profile.account_id,
          total_cash: 0,
          chart_show_forecast_line: false
        });

      if (error) throw error;
      setTotalCash(0);
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const updateTotalCash = async (amountToAdd: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) {
        throw new Error('Account not found');
      }

      // Calculate new total by adding to current amount
      const newTotal = totalCash + amountToAdd;

      const { error } = await supabase
        .from('user_settings')
        .update({ total_cash: newTotal })
        .eq('user_id', user.id);

      if (error) throw error;

      setTotalCash(newTotal);
      console.info('Cash updated in database:', newTotal, '(added:', amountToAdd, ')');
    } catch (error) {
      console.error('Error updating total cash:', error);
      toast({
        title: "Error",
        description: "Failed to update cash amount",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUserSettings();

    // Subscribe to realtime changes to user_settings
    let channel: any = null;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        channel = supabase
          .channel('user-settings-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'user_settings',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('🔄 User settings changed:', payload);
              if (payload.new) {
                const newForecastsEnabled = payload.new.forecasts_enabled ?? false;
                console.log('📊 Updating forecastsEnabled to:', newForecastsEnabled);
                setForecastsEnabled(newForecastsEnabled);
                setTotalCash(Number(payload.new.total_cash) || 0);
                
                // Update chart preferences
                setChartPreferences({
                  showCashFlowLine: payload.new.chart_show_cashflow_line ?? true,
                  showTotalResourcesLine: payload.new.chart_show_resources_line ?? true,
                  showCreditCardLine: payload.new.chart_show_credit_line ?? true,
                  showReserveLine: payload.new.chart_show_reserve_line ?? true,
                  showForecastLine: payload.new.chart_show_forecast_line ?? false,
                  cashFlowColor: payload.new.chart_cashflow_color || 'hsl(221, 83%, 53%)',
                  totalResourcesColor: payload.new.chart_resources_color || '#10b981',
                  creditCardColor: payload.new.chart_credit_color || '#f59e0b',
                  reserveColor: payload.new.chart_reserve_color || '#ef4444',
                  forecastColor: payload.new.chart_forecast_color || '#a855f7',
                });
              }
            }
          )
          .subscribe();
      }
    };

    setupRealtimeSubscription();

    // Cleanup function
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const setStartingBalance = async (amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) {
        throw new Error('Account not found');
      }

      const { error } = await supabase
        .from('user_settings')
        .update({ total_cash: amount })
        .eq('user_id', user.id);

      if (error) throw error;

      setTotalCash(amount);
      
      toast({
        title: "Success",
        description: `Starting balance set to $${amount.toLocaleString()}`,
      });
    } catch (error) {
      console.error('Error setting starting balance:', error);
      toast({
        title: "Error",
        description: "Failed to set starting balance",
        variant: "destructive",
      });
    }
  };

  const resetAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🗑️ Starting account reset for user:', user.id);

      // Get user's account_id first
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) {
        throw new Error('Account not found');
      }

      const accountId = profile.account_id;
      console.log('🗑️ Deleting all data for account:', accountId);

      // Delete dependent records first (in proper order to avoid FK constraint violations)
      console.log('🗑️ Step 1: Deleting dependent records...');
      const dependentDeletes = [
        { name: 'bank_transactions', promise: supabase.from('bank_transactions').delete().eq('account_id', accountId) },
        { name: 'amazon_transactions', promise: supabase.from('amazon_transactions').delete().eq('account_id', accountId) },
        { name: 'amazon_payouts', promise: supabase.from('amazon_payouts').delete().eq('account_id', accountId) },
        { name: 'transactions', promise: supabase.from('transactions').delete().eq('account_id', accountId) },
        { name: 'cash_flow_events', promise: supabase.from('cash_flow_events').delete().eq('account_id', accountId) },
        { name: 'cash_flow_insights', promise: supabase.from('cash_flow_insights').delete().eq('account_id', accountId) },
        { name: 'documents_metadata', promise: supabase.from('documents_metadata').delete().eq('account_id', accountId) },
        { name: 'notification_history', promise: supabase.from('notification_history').delete().eq('account_id', accountId) },
        { name: 'deleted_transactions', promise: supabase.from('deleted_transactions').delete().eq('user_id', user.id) },
      ];

      const dependentResults = await Promise.allSettled(dependentDeletes.map(op => op.promise));
      dependentResults.forEach((result, index) => {
        const opName = dependentDeletes[index].name;
        if (result.status === 'fulfilled') {
          const { error } = result.value;
          if (error) {
            console.error(`❌ Failed to delete ${opName}:`, error);
          } else {
            console.log(`✅ Deleted ${opName}`);
          }
        } else {
          console.error(`❌ Delete operation failed for ${opName}:`, result.reason);
        }
      });

      // Delete parent records (bank accounts, vendors, etc.)
      console.log('🗑️ Step 2: Deleting parent records...');
      const parentDeletes = [
        { name: 'bank_accounts', promise: supabase.from('bank_accounts').delete().eq('account_id', accountId) },
        { name: 'credit_cards', promise: supabase.from('credit_cards').delete().eq('account_id', accountId) },
        { name: 'amazon_accounts', promise: supabase.from('amazon_accounts').delete().eq('account_id', accountId) },
        { name: 'income', promise: supabase.from('income').delete().eq('account_id', accountId) },
        { name: 'vendors', promise: supabase.from('vendors').delete().eq('account_id', accountId) },
        { name: 'customers', promise: supabase.from('customers').delete().eq('account_id', accountId) },
        { name: 'recurring_expenses', promise: supabase.from('recurring_expenses').delete().eq('account_id', accountId) },
        { name: 'scenarios', promise: supabase.from('scenarios').delete().eq('account_id', accountId) },
        { name: 'categories', promise: supabase.from('categories').delete().eq('account_id', accountId).eq('is_default', false) },
        { name: 'notification_preferences', promise: supabase.from('notification_preferences').delete().eq('account_id', accountId) },
        { name: 'trial_addon_usage', promise: supabase.from('trial_addon_usage').delete().eq('user_id', user.id) },
        { name: 'support_tickets', promise: supabase.from('support_tickets').delete().eq('user_id', user.id) },
        { name: 'referrals_referrer', promise: supabase.from('referrals').delete().eq('referrer_id', user.id) },
        { name: 'referrals_referred', promise: supabase.from('referrals').delete().eq('referred_user_id', user.id) },
        { name: 'referral_codes', promise: supabase.from('referral_codes').delete().eq('user_id', user.id) },
        { name: 'referral_rewards', promise: supabase.from('referral_rewards').delete().eq('user_id', user.id) },
      ];

      const results = await Promise.allSettled(parentDeletes.map(op => op.promise));
      
      // Log results
      results.forEach((result, index) => {
        const opName = parentDeletes[index].name;
        if (result.status === 'fulfilled') {
          const { error } = result.value;
          if (error) {
            console.error(`❌ Failed to delete ${opName}:`, error);
          } else {
            console.log(`✅ Deleted ${opName}`);
          }
        } else {
          console.error(`❌ Delete operation failed for ${opName}:`, result.reason);
        }
      });

      // Fetch existing user roles to preserve them
      const { data: existingRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', accountId);

      console.log('📋 Existing roles to preserve:', existingRoles);

      // Preserve all existing roles after clearing data
      if (existingRoles && existingRoles.length > 0) {
        const roleUpserts = existingRoles.map(r => ({
          user_id: user.id,
          account_id: accountId,
          role: r.role
        }));

        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert(roleUpserts, {
            onConflict: 'user_id,account_id,role'
          });

        if (roleError) {
          console.error('Failed to preserve user roles:', roleError);
        } else {
          console.log('✅ Preserved all user roles:', existingRoles.map(r => r.role).join(', '));
        }
      } else {
        // No existing roles, ensure at least owner role
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: user.id,
            account_id: accountId,
            role: 'owner'
          }, {
            onConflict: 'user_id,account_id,role'
          });

        if (roleError) {
          console.error('Failed to ensure owner role:', roleError);
        } else {
          console.log('✅ Ensured owner role exists');
        }
      }

      // Reset user_settings using user_id
      const { error: upsertError } = await supabase
        .from('user_settings')
        .update({
          total_cash: 0,
          safe_spending_percentage: 20,
          safe_spending_reserve: 0,
          chart_show_forecast_line: false
        })
        .eq('user_id', user.id);

      if (upsertError) {
        console.error('Failed to reset user settings:', upsertError);
        throw upsertError;
      }

      console.log('✅ Reset user_settings');
      setTotalCash(0);
      
      // Clear localStorage flags to allow fresh setup
      localStorage.removeItem('balance_start_0');
      localStorage.removeItem('vendors_cleaned');
      localStorage.removeItem('transactions_cleaned_v2');
      
      toast({
        title: "Success",
        description: "All account data has been completely reset",
      });

      console.log('✅ Account reset complete, redirecting to onboarding...');

      // Redirect to onboarding to start fresh
      setTimeout(() => {
        window.location.href = '/onboarding';
      }, 500);
    } catch (error) {
      console.error('Error resetting account:', error);
      toast({
        title: "Error",
        description: "Failed to reset account data",
        variant: "destructive",
      });
    }
  };

  return {
    totalCash,
    loading,
    forecastsEnabled,
    chartPreferences,
    updateTotalCash,
    setStartingBalance,
    resetAccount,
    updateChartPreferences,
    refetch: fetchUserSettings
  };
};