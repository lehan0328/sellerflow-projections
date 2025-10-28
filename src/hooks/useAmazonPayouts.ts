import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface AmazonPayout {
  id: string;
  amazon_account_id: string;
  settlement_id: string;
  payout_date: string;
  total_amount: number;
  currency_code: string;
  status: "confirmed" | "estimated" | "processing" | "forecasted";
  payout_type: "bi-weekly" | "reserve-release" | "adjustment";
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
  };
}

export const useAmazonPayouts = () => {
  const { user } = useAuth();
  const [amazonPayouts, setAmazonPayouts] = useState<AmazonPayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAmazonPayouts = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('[fetchAmazonPayouts] Fetching Amazon payouts for user:', user.id);
      
      // Check if forecasts are enabled
      const { data: settings } = await supabase
        .from('user_settings')
        .select('forecasts_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      const forecastsEnabled = settings?.forecasts_enabled ?? true;

      const { data, error } = await supabase
        .from("amazon_payouts")
        .select(`
          *,
          amazon_accounts!inner(
            account_name,
            marketplace_name,
            is_active
          )
        `)
        .eq("user_id", user.id)
        .eq("amazon_accounts.is_active", true)
        .order("payout_date", { ascending: false });
      
      console.log('[fetchAmazonPayouts] Query result:', { count: data?.length, error });

      if (error) {
        console.error("Error fetching Amazon payouts:", error);
        toast.error("Failed to load Amazon payouts");
        return;
      }

      // Filter payouts based on settings
      const filteredPayouts = (data || []).filter((payout) => {
        // For open settlements (estimated), only show if they close in the future
        if (payout.status === 'estimated') {
          const rawData = payout.raw_settlement_data as any;
          const settlementStartStr = rawData?.settlement_start_date || rawData?.FinancialEventGroupStart;
          
          if (!settlementStartStr) {
            console.log('[fetchAmazonPayouts] No start date for open settlement, excluding:', payout.id);
            return false;
          }
          
          // Calculate close date: start date + 14 days
          const settlementStartDate = new Date(settlementStartStr);
          const settlementCloseDate = new Date(settlementStartDate);
          settlementCloseDate.setDate(settlementCloseDate.getDate() + 14);
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          settlementCloseDate.setHours(0, 0, 0, 0);
          
          // Only show open settlements that close today or in the future
          if (settlementCloseDate < today) {
            console.log('[fetchAmazonPayouts] Filtering past open settlement:', {
              id: payout.id,
              start_date: settlementStartStr,
              close_date: settlementCloseDate.toISOString().split('T')[0],
              amount: payout.total_amount,
              reason: 'Settlement already closed'
            });
            return false;
          }
          
          console.log('[fetchAmazonPayouts] Keeping future open settlement:', {
            id: payout.id,
            status: payout.status,
            start_date: settlementStartStr,
            close_date: settlementCloseDate.toISOString().split('T')[0],
            amount: payout.total_amount
          });
          return true;
        }
        
        // Always show confirmed settlements
        if (payout.status === 'confirmed') {
          console.log('[fetchAmazonPayouts] Keeping confirmed settlement:', {
            id: payout.id,
            status: payout.status,
            date: payout.payout_date,
            amount: payout.total_amount
          });
          return true;
        }
        
        // Only filter our mathematical forecasts based on settings
        if (!forecastsEnabled && payout.status === 'forecasted') return false;
        
        // Keep mathematical forecasts if enabled
        if (payout.status === 'forecasted') {
        
          // For mathematical forecasts, only keep if no actual payout exists for same date & account
          const hasActualPayout = data.some(
            (p) =>
              p.amazon_account_id === payout.amazon_account_id &&
              p.payout_date === payout.payout_date &&
              (p.status === 'confirmed' || p.status === 'estimated') &&
              p.id !== payout.id
          );
          
          return !hasActualPayout;
        }
        
        return true;
      });

      console.log('[fetchAmazonPayouts] Filtered payouts:', filteredPayouts.length, 'total');
      console.log('[fetchAmazonPayouts] Open settlements:', filteredPayouts.filter(p => p.status === 'estimated').length);

      // Parse and enrich with metadata
      setAmazonPayouts(filteredPayouts.map(payout => {
        const rawData = payout.raw_settlement_data as any;
        const metadata = rawData?.forecast_metadata;
        return {
          ...payout,
          status: payout.status as "confirmed" | "estimated" | "processing" | "forecasted",
          payout_type: payout.payout_type as "bi-weekly" | "reserve-release" | "adjustment",
          available_for_daily_transfer: metadata?.daily_unlock_amount || 0,
          // Use database fields first, fallback to metadata
          settlement_start_date: (payout as any).settlement_start_date || metadata?.settlement_period?.start,
          settlement_end_date: (payout as any).settlement_end_date || metadata?.settlement_period?.end,
          days_accumulated: metadata?.days_accumulated || 0
        };
      }));
    } catch (error) {
      console.error("Error fetching Amazon payouts:", error);
      toast.error("Failed to load Amazon payouts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAmazonPayouts();
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("amazon_payouts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "amazon_payouts",
        },
        () => {
          fetchAmazonPayouts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Calculate summary statistics
  const totalUpcoming = amazonPayouts
    .filter(payout => new Date(payout.payout_date) >= new Date())
    .reduce((sum, payout) => sum + payout.total_amount, 0);

  const totalConfirmed = amazonPayouts
    .filter(payout => payout.status === 'confirmed')
    .reduce((sum, payout) => sum + payout.total_amount, 0);

  const totalEstimated = amazonPayouts
    .filter(payout => payout.status === 'estimated')
    .reduce((sum, payout) => sum + payout.total_amount, 0);
  
  // Calculate available today (for daily payout accounts)
  const todayStr = new Date().toISOString().split('T')[0];
  const availableToday = amazonPayouts
    .filter(payout => payout.payout_date === todayStr)
    .reduce((sum, payout) => sum + (payout.available_for_daily_transfer || 0), 0);

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
    amazonPayouts,
    isLoading,
    totalUpcoming,
    totalConfirmed,
    totalEstimated,
    monthlyOrdersTotal,
    availableToday,
    refetch: fetchAmazonPayouts
  };
};