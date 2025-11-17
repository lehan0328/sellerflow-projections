import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useEffect, useMemo } from "react";

export interface AmazonPayout {
  id: string;
  amazon_account_id: string;
  settlement_id: string;
  payout_date: string;
  total_amount: number;
  currency_code: string;
  status: "confirmed" | "estimated" | "processing" | "forecasted" | "rolled_over";
  payout_type: "bi-weekly" | "reserve-release" | "adjustment" | "daily";
  marketplace_name: string;
  transaction_count: number;
  fees_total: number;
  orders_total: number;
  refunds_total: number;
  other_total: number;
  raw_settlement_data?: any;
  created_at: string;
  updated_at: string;
  available_for_daily_transfer?: number;
  total_daily_draws?: number;
  eligible_in_period?: number;
  reserve_amount?: number;
  amazon_accounts?: {
    account_name: string;
    marketplace_name: string;
    payout_frequency?: 'daily' | 'bi-weekly';
  };
  // Forecast accuracy tracking
  original_forecast_amount?: number | null;
  forecast_replaced_at?: string | null;
  forecast_accuracy_percentage?: number | null;
  modeling_method?: string | null;
  // Daily forecast metadata (Delivery Date + 7)
  backlog_amount?: number;
  daily_unlock_amount?: number;
  safety_adjusted_amount?: number;
  days_since_cashout?: number;
  last_cashout_date?: string;
  growth_factor?: number;
  avg_daily_unlock?: number;
  // Bi-weekly forecast metadata
  settlement_start_date?: string;
  settlement_end_date?: string;
  days_accumulated?: number;
}

export const useAmazonPayouts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Fetch User Settings (Forecasts & Advanced Modeling)
  const { data: settings } = useQuery({
    queryKey: ['user_settings', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('forecasts_enabled, advanced_modeling_enabled')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user settings:", error);
        return null;
      }
      return data;
    }
  });

  const forecastsEnabled = settings?.forecasts_enabled ?? true;
  const advancedModelingEnabled = settings?.advanced_modeling_enabled ?? false;

  // 2. Fetch and Filter Amazon Payouts
  const { data: amazonPayouts = [], isLoading, error } = useQuery({
    queryKey: ['amazon_payouts', user?.id],
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async () => {
      const { data, error } = await supabase
        .from("amazon_payouts")
        .select(`
          *,
          amazon_accounts(
            account_name,
            marketplace_name,
            is_active,
            payout_frequency
          )
        `)
        .eq("user_id", user!.id)
        .order("payout_date", { ascending: false });

      if (error) {
        console.error("Error fetching Amazon payouts:", error);
        toast.error("Failed to load Amazon payouts");
        throw error;
      }

      // Filter payouts based on logic
      const filteredPayouts = (data || []).filter((payout) => {
        // Always include open settlements (estimated) - let the component decide display logic
        if (payout.status === 'estimated') {
          const rawData = payout.raw_settlement_data as any;
          const hasEndDate = !!(rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date);
          
          // For open settlements (no end date), check if they're still active
          if (!hasEndDate) {
            const settlementStartStr = rawData?.settlement_start_date || rawData?.FinancialEventGroupStart;
            
            if (!settlementStartStr) {
              return false; // Can't validate, exclude it
            }
            
            const settlementStartDate = new Date(settlementStartStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Calculate how long ago the settlement started
            const daysSinceStart = Math.floor((today.getTime() - settlementStartDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // Get payout frequency from joined account data
            const payoutFrequency = payout.amazon_accounts?.payout_frequency || payout.payout_type;
            
            // Filter logic:
            // - Daily accounts: only show settlements from last 3 days
            // - Bi-weekly accounts: only show settlements from last 20 days (14 day cycle + buffer)
            const maxDays = payoutFrequency === 'bi-weekly' ? 20 : 3;
            
            if (daysSinceStart > maxDays) {
              return false;
            }
            
            return true;
          }
          
          // For closed estimated settlements, apply date filtering
          const settlementStartStr = rawData?.settlement_start_date || rawData?.FinancialEventGroupStart;
          
          if (!settlementStartStr) {
            return false;
          }
          
          // Calculate close date: start date + 14 days
          const settlementStartDate = new Date(settlementStartStr);
          const settlementCloseDate = new Date(settlementStartDate);
          settlementCloseDate.setDate(settlementCloseDate.getDate() + 14);
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          settlementCloseDate.setHours(0, 0, 0, 0);
          
          // Only show closed estimated settlements that close today or in the future
          if (settlementCloseDate < today) {
            return false;
          }
          return true;
        }
        
        // Always show confirmed, forecasted, and rolled_over settlements
        if (['confirmed', 'forecasted', 'rolled_over'].includes(payout.status)) {
          return true;
        }
        
        return true;
      });

      // Parse and enrich with metadata
      return filteredPayouts.map(payout => {
        const rawData = payout.raw_settlement_data as any;
        const metadata = rawData?.forecast_metadata;
        
        return {
          ...payout,
          status: payout.status as AmazonPayout['status'],
          payout_type: payout.payout_type as AmazonPayout['payout_type'],
          amazon_accounts: payout.amazon_accounts ? {
            ...payout.amazon_accounts,
            payout_frequency: payout.amazon_accounts.payout_frequency as 'daily' | 'bi-weekly' | undefined
          } : undefined,
          
          // Daily forecast metadata (Delivery Date + 7 method)
          backlog_amount: metadata?.backlog_amount || 0,
          daily_unlock_amount: metadata?.daily_unlock_amount || 0,
          safety_adjusted_amount: metadata?.safety_adjusted_amount || 0,
          days_since_cashout: metadata?.days_since_cashout || 0,
          last_cashout_date: metadata?.last_cashout_date,
          growth_factor: metadata?.growth_factor || 1.0,
          avg_daily_unlock: metadata?.avg_daily_unlock || 0,
          available_for_daily_transfer: metadata?.safety_adjusted_amount || metadata?.daily_unlock_amount || 0,
          
          // Bi-weekly forecast metadata
          settlement_start_date: (payout as any).settlement_start_date || metadata?.settlement_period?.start,
          settlement_end_date: (payout as any).settlement_end_date || metadata?.settlement_period?.end,
          days_accumulated: metadata?.days_accumulated || 0
        } as AmazonPayout;
      });
    }
  });

  // 3. Real-time Subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("amazon_payouts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "amazon_payouts" },
        () => {
          // Only invalidate the query, don't manually fetch
          queryClient.invalidateQueries({ queryKey: ['amazon_payouts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // 4. Derived Calculations (Memoized)
  const stats = useMemo(() => {
    const totalUpcoming = amazonPayouts
      .filter(payout => 
        payout.status === 'forecasted' && 
        new Date(payout.payout_date) >= new Date()
      )
      .reduce((sum, payout) => sum + payout.total_amount, 0);

    const totalConfirmed = amazonPayouts
      .filter(payout => payout.status === 'confirmed')
      .reduce((sum, payout) => sum + payout.total_amount, 0);

    // Exclude ALL estimated settlements for DAILY accounts (they use forecasts instead)
    const totalEstimated = amazonPayouts
      .filter(payout => {
        if (payout.status !== 'estimated') return false;
        
        // For daily accounts, COMPLETELY exclude all estimated settlements
        const accountFrequency = payout.amazon_accounts?.payout_frequency;
        if (accountFrequency === 'daily') {
          return false;
        }
        
        // For bi-weekly accounts, only count if forecasts are disabled
        if (forecastsEnabled || advancedModelingEnabled) {
          return false;
        }
        
        return true; // Count bi-weekly open settlements when forecasts disabled
      })
      .reduce((sum, payout) => sum + payout.total_amount, 0);
    
    // Calculate available today (for daily payout accounts)
    const todayStr = new Date().toISOString().split('T')[0];
    const availableToday = amazonPayouts
      .filter(payout => payout.payout_date === todayStr)
      .reduce((sum, payout) => sum + (payout.available_for_daily_transfer || 0), 0);

    // Calculate cumulative available for daily settlements
    const todayForecast = amazonPayouts.find((p) => 
      p.status === 'forecasted' && 
      p.payout_date === todayStr &&
      p.payout_type === 'daily'
    );
    
    const cumulativeAvailable = todayForecast?.raw_settlement_data?.forecast_metadata?.cumulative_available || 0;
    const daysSinceLastCashOut = todayForecast?.raw_settlement_data?.forecast_metadata?.days_since_last_cashout || 0;
    const lastCashOutDate = todayForecast?.raw_settlement_data?.forecast_metadata?.last_cashout_date || null;

    // Calculate orders total for current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyOrdersTotal = amazonPayouts
      .filter(payout => {
        const payoutDate = new Date(payout.payout_date);
        return payoutDate.getMonth() === currentMonth && 
               payoutDate.getFullYear() === currentYear;
      })
      .reduce((sum, payout) => sum + (payout.orders_total || 0), 0);

    return {
      totalUpcoming,
      totalConfirmed,
      totalEstimated,
      availableToday,
      cumulativeAvailable,
      daysSinceLastCashOut,
      lastCashOutDate,
      monthlyOrdersTotal
    };
  }, [amazonPayouts, forecastsEnabled, advancedModelingEnabled]);

  return {
    amazonPayouts,
    isLoading,
    forecastsEnabled,
    advancedModelingEnabled,
    ...stats,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['amazon_payouts'] })
  };
};