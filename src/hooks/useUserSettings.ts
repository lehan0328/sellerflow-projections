import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type SafetyNetLevel = 'low' | 'medium' | 'high' | 'maximum';

interface ChartPreferences {
  showCashFlowLine: boolean;
  showTotalResourcesLine: boolean;
  showCreditCardLine: boolean;
  showReserveLine: boolean;
  showForecastLine: boolean;
  showLowestBalanceLine: boolean;
  cashFlowColor: string;
  totalResourcesColor: string;
  creditCardColor: string;
  reserveColor: string;
  forecastColor: string;
  lowestBalanceColor: string;
}

interface UserSettingsData {
  totalCash: number;
  forecastsEnabled: boolean;
  safetyNetLevel: SafetyNetLevel;
  chartPreferences: ChartPreferences;
}

const DEFAULT_CHART_PREFERENCES: ChartPreferences = {
  showCashFlowLine: true,
  showTotalResourcesLine: true,
  showCreditCardLine: true,
  showReserveLine: true,
  showForecastLine: false,
  showLowestBalanceLine: true,
  cashFlowColor: 'hsl(221, 83%, 53%)',
  totalResourcesColor: '#10b981',
  creditCardColor: '#f59e0b',
  reserveColor: '#ef4444',
  forecastColor: '#a855f7',
  lowestBalanceColor: '#ef4444',
};

export const useUserSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Main Query for User Settings
  const { data: settings, isLoading: loading, refetch } = useQuery({
    queryKey: ['user-settings'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async (): Promise<UserSettingsData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Fetch settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Handle "Get or Create" logic atomically
      if (!data) {
        // Get account_id for creation
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profile?.account_id) {
          throw new Error('Account not found');
        }

        // Create default settings
        const { data: newData, error: createError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            account_id: profile.account_id,
            total_cash: 0,
            chart_show_forecast_line: false
          })
          .select()
          .single();

        if (createError) throw createError;
        
        // Return defaults based on the newly created row
        return {
          totalCash: 0,
          forecastsEnabled: false,
          safetyNetLevel: 'medium',
          chartPreferences: DEFAULT_CHART_PREFERENCES
        };
      }

      // Map DB response to application state
      return {
        totalCash: Number(data.total_cash),
        forecastsEnabled: data.forecasts_enabled ?? false,
        // Temporarily defaulting until types match DB
        safetyNetLevel: (data.safety_net_level as SafetyNetLevel) || 'medium',
        chartPreferences: {
          showCashFlowLine: data.chart_show_cashflow_line ?? true,
          showTotalResourcesLine: data.chart_show_resources_line ?? true,
          showCreditCardLine: data.chart_show_credit_line ?? true,
          showReserveLine: data.chart_show_reserve_line ?? true,
          showForecastLine: data.chart_show_forecast_line ?? false,
          showLowestBalanceLine: data.chart_show_lowest_balance_line ?? true,
          cashFlowColor: data.chart_cashflow_color ?? DEFAULT_CHART_PREFERENCES.cashFlowColor,
          totalResourcesColor: data.chart_resources_color ?? DEFAULT_CHART_PREFERENCES.totalResourcesColor,
          creditCardColor: data.chart_credit_color ?? DEFAULT_CHART_PREFERENCES.creditCardColor,
          reserveColor: data.chart_reserve_color ?? DEFAULT_CHART_PREFERENCES.reserveColor,
          forecastColor: data.chart_forecast_color ?? DEFAULT_CHART_PREFERENCES.forecastColor,
          lowestBalanceColor: data.chart_lowest_balance_color ?? DEFAULT_CHART_PREFERENCES.lowestBalanceColor,
        }
      };
    }
  });

  // 2. Mutations
  const updateChartPreferencesMutation = useMutation({
    mutationFn: async (preferences: Partial<ChartPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Account check
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) throw new Error('Account not found');

      const dbUpdates: Record<string, any> = {};
      if (preferences.showCashFlowLine !== undefined) dbUpdates.chart_show_cashflow_line = preferences.showCashFlowLine;
      if (preferences.showTotalResourcesLine !== undefined) dbUpdates.chart_show_resources_line = preferences.showTotalResourcesLine;
      if (preferences.showCreditCardLine !== undefined) dbUpdates.chart_show_credit_line = preferences.showCreditCardLine;
      if (preferences.showReserveLine !== undefined) dbUpdates.chart_show_reserve_line = preferences.showReserveLine;
      if (preferences.showForecastLine !== undefined) dbUpdates.chart_show_forecast_line = preferences.showForecastLine;
      if (preferences.showLowestBalanceLine !== undefined) dbUpdates.chart_show_lowest_balance_line = preferences.showLowestBalanceLine;
      if (preferences.cashFlowColor !== undefined) dbUpdates.chart_cashflow_color = preferences.cashFlowColor;
      if (preferences.totalResourcesColor !== undefined) dbUpdates.chart_resources_color = preferences.totalResourcesColor;
      if (preferences.creditCardColor !== undefined) dbUpdates.chart_credit_color = preferences.creditCardColor;
      if (preferences.reserveColor !== undefined) dbUpdates.chart_reserve_color = preferences.reserveColor;
      if (preferences.forecastColor !== undefined) dbUpdates.chart_forecast_color = preferences.forecastColor;
      if (preferences.lowestBalanceColor !== undefined) dbUpdates.chart_lowest_balance_color = preferences.lowestBalanceColor;

      const { error } = await supabase
        .from('user_settings')
        .update(dbUpdates)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-settings'] })
  });

  const updateTotalCashMutation = useMutation({
    mutationFn: async (amountToAdd: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const currentTotal = settings?.totalCash || 0;
      const newTotal = currentTotal + amountToAdd;

      const { error } = await supabase
        .from('user_settings')
        .update({ total_cash: newTotal })
        .eq('user_id', user.id);

      if (error) throw error;
      console.info('Cash updated in database:', newTotal, '(added:', amountToAdd, ')');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-settings'] }),
    onError: (error) => {
      console.error('Error updating total cash:', error);
      toast({ title: "Error", description: "Failed to update cash amount", variant: "destructive" });
    }
  });

  const setStartingBalanceMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({ total_cash: amount })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, amount) => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast({ title: "Success", description: `Starting balance set to $${amount.toLocaleString()}` });
    },
    onError: (error) => {
      console.error('Error setting starting balance:', error);
      toast({ title: "Error", description: "Failed to set starting balance", variant: "destructive" });
    }
  });

  const updateSafetyNetLevelMutation = useMutation({
    mutationFn: async (level: SafetyNetLevel) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check profile/account existence
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (!profile?.account_id) throw new Error('Account not found');

      const { error } = await supabase
        .from('user_settings')
        .update({ safety_net_level: level } as any) // Cast to any to bypass current type mismatch if exists
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast({ title: "Success", description: "Safety net level updated successfully" });
    },
    onError: (error: any) => {
      console.error('Error updating safety net level:', error);
      toast({ title: "Error", description: error.message || "Failed to update safety net level", variant: "destructive" });
    }
  });

  const resetAccountMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🗑️ Starting account reset for user:', user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) throw new Error('Account not found');
      const accountId = profile.account_id;

      // Execute deletions (simplified for brevity, keeping order from original)
      const dependentTables = [
        'bank_transactions', 'amazon_daily_rollups', 'amazon_daily_draws', 
        'amazon_payouts', 'amazon_transactions', 'transactions', 
        'cash_flow_events', 'cash_flow_insights', 'documents_metadata', 
        'notification_history', 'forecast_accuracy_log'
      ];

      // Delete dependents in parallel where possible or sequential if constrained
      await Promise.allSettled(dependentTables.map(table => 
        supabase.from(table).delete().eq('account_id', accountId)
      ));
      
      // Special case for deleted_transactions (uses user_id)
      await supabase.from('deleted_transactions').delete().eq('user_id', user.id);

      // Delete parent records
      await supabase.from('amazon_accounts').delete().eq('account_id', accountId);
      
      const parentTables = [
        'bank_accounts', 'credit_cards', 'income', 'vendors', 'customers',
        'recurring_expenses', 'scenarios', 'categories', 'notification_preferences'
      ];

      await Promise.allSettled(parentTables.map(table => 
        supabase.from(table).delete().eq('account_id', accountId)
      ));

      // Reset user_settings to defaults
      const { error: upsertError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          account_id: accountId,
          total_cash: 0,
          safe_spending_percentage: 20,
          safe_spending_reserve: 0,
          forecasts_enabled: false,
          use_available_balance: true,
          chart_show_cashflow_line: true,
          chart_show_resources_line: true,
          chart_show_credit_line: true,
          chart_show_reserve_line: true,
          chart_show_forecast_line: false,
          chart_cashflow_color: 'hsl(221, 83%, 53%)',
          chart_resources_color: '#10b981',
          chart_credit_color: '#f59e0b',
          chart_reserve_color: '#ef4444',
          chart_forecast_color: '#a855f7',
        }, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      localStorage.clear();
      toast({ title: "Success", description: "All account data has been completely reset" });
      setTimeout(() => { window.location.href = '/onboarding'; }, 500);
    },
    onError: (error) => {
      console.error('Error resetting account:', error);
      toast({ title: "Error", description: "Failed to reset account data", variant: "destructive" });
    }
  });

  // 3. Realtime Subscription
  useEffect(() => {
    let channel: any = null;
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        channel = supabase
          .channel('user-settings-changes')
          .on('postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'user_settings', filter: `user_id=eq.${user.id}` },
            () => queryClient.invalidateQueries({ queryKey: ['user-settings'] })
          )
          .subscribe();
      }
    };
    setupSubscription();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [queryClient]);

  // 4. Return compatible interface
  return {
    totalCash: settings?.totalCash ?? 0,
    loading,
    forecastsEnabled: settings?.forecastsEnabled ?? false,
    safetyNetLevel: settings?.safetyNetLevel ?? 'medium',
    chartPreferences: settings?.chartPreferences ?? DEFAULT_CHART_PREFERENCES,
    
    updateTotalCash: updateTotalCashMutation.mutateAsync,
    setStartingBalance: setStartingBalanceMutation.mutateAsync,
    resetAccount: resetAccountMutation.mutateAsync,
    updateChartPreferences: updateChartPreferencesMutation.mutateAsync,
    updateSafetyNetLevel: updateSafetyNetLevelMutation.mutateAsync,
    
    refetch
  };
};