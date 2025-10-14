import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useUserSettings = () => {
  const [totalCash, setTotalCash] = useState(0);
  const [loading, setLoading] = useState(true);
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
        .single();

      if (error) {
        // If no settings exist, create default settings
        if (error.code === 'PGRST116') {
          await createDefaultSettings(user.id);
          return;
        }
        throw error;
      }

      setTotalCash(Number(data.total_cash));
      
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
    } catch (error) {
      console.error('Error fetching user settings:', error);
      toast({
        title: "Error",
        description: "Failed to load user settings",
        variant: "destructive",
      });
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

      // Delete all user data from all tables with individual error checking
      const deleteOperations = [
        { name: 'bank_accounts', promise: supabase.from('bank_accounts').delete().eq('user_id', user.id) },
        { name: 'bank_transactions', promise: supabase.from('bank_transactions').delete().eq('user_id', user.id) },
        { name: 'credit_cards', promise: supabase.from('credit_cards').delete().eq('user_id', user.id) },
        { name: 'amazon_accounts', promise: supabase.from('amazon_accounts').delete().eq('user_id', user.id) },
        { name: 'amazon_payouts', promise: supabase.from('amazon_payouts').delete().eq('user_id', user.id) },
        { name: 'amazon_transactions', promise: supabase.from('amazon_transactions').delete().eq('user_id', user.id) },
        { name: 'transactions', promise: supabase.from('transactions').delete().eq('user_id', user.id) },
        { name: 'income', promise: supabase.from('income').delete().eq('user_id', user.id) },
        { name: 'vendors', promise: supabase.from('vendors').delete().eq('user_id', user.id) },
        { name: 'customers', promise: supabase.from('customers').delete().eq('user_id', user.id) },
        { name: 'recurring_expenses', promise: supabase.from('recurring_expenses').delete().eq('user_id', user.id) },
        { name: 'scenarios', promise: supabase.from('scenarios').delete().eq('user_id', user.id) },
        { name: 'cash_flow_events', promise: supabase.from('cash_flow_events').delete().eq('user_id', user.id) },
        { name: 'cash_flow_insights', promise: supabase.from('cash_flow_insights').delete().eq('user_id', user.id) },
        { name: 'deleted_transactions', promise: supabase.from('deleted_transactions').delete().eq('user_id', user.id) },
        { name: 'trial_addon_usage', promise: supabase.from('trial_addon_usage').delete().eq('user_id', user.id) },
        { name: 'support_tickets', promise: supabase.from('support_tickets').delete().eq('user_id', user.id) },
        { name: 'user_roles', promise: supabase.from('user_roles').delete().eq('user_id', user.id) },
        { name: 'referrals_referrer', promise: supabase.from('referrals').delete().eq('referrer_id', user.id) },
        { name: 'referrals_referred', promise: supabase.from('referrals').delete().eq('referred_user_id', user.id) },
        { name: 'referral_codes', promise: supabase.from('referral_codes').delete().eq('user_id', user.id) },
        { name: 'referral_rewards', promise: supabase.from('referral_rewards').delete().eq('user_id', user.id) },
      ];

      const results = await Promise.allSettled(deleteOperations.map(op => op.promise));
      
      // Log results
      results.forEach((result, index) => {
        const opName = deleteOperations[index].name;
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

      // Get user's account_id for reset
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) {
        throw new Error('Account not found');
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
    chartPreferences,
    updateTotalCash,
    setStartingBalance,
    resetAccount,
    updateChartPreferences,
    refetch: fetchUserSettings
  };
};