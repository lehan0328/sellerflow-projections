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
      // Only fetch payouts from today onwards (archive past payouts)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("amazon_payouts")
        .select(`
          *,
          amazon_accounts(
            account_name,
            marketplace_name
          )
        `)
        .order("payout_date", { ascending: true });

      if (error) {
        console.error("Error fetching Amazon payouts:", error);
        toast.error("Failed to load Amazon payouts");
        return;
      }

      // Filter out forecasted payouts when actual payouts exist for same date & account
      const filteredPayouts = (data || []).filter((payout) => {
        // Keep all non-forecasted payouts
        if (payout.status !== 'forecasted') return true;
        
        // For forecasted payouts, only keep if no actual payout exists for same date & account
        const hasActualPayout = data.some(
          (p) =>
            p.amazon_account_id === payout.amazon_account_id &&
            p.payout_date === payout.payout_date &&
            p.status !== 'forecasted' &&
            p.id !== payout.id
        );
        
        return !hasActualPayout;
      });

      setAmazonPayouts(filteredPayouts.map(payout => ({
        ...payout,
        status: payout.status as "confirmed" | "estimated" | "processing" | "forecasted",
        payout_type: payout.payout_type as "bi-weekly" | "reserve-release" | "adjustment"
      })));
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