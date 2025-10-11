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
  created_at: string;
  updated_at: string;
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
          amazon_accounts!inner(
            account_name,
            marketplace_name
          )
        `)
        .eq("user_id", user.id)
        .gte("payout_date", todayStr)
        .order("payout_date", { ascending: true });

      if (error) {
        console.error("Error fetching Amazon payouts:", error);
        toast.error("Failed to load Amazon payouts");
        return;
      }

      setAmazonPayouts((data || []).map(payout => ({
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
          filter: `user_id=eq.${user.id}`,
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
    refetch: fetchAmazonPayouts
  };
};