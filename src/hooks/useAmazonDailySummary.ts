import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AmazonDailySummary {
  id: string;
  user_id: string;
  account_id: string | null;
  amazon_account_id: string;
  transaction_date: string;
  orders_count: number;
  orders_total: number;
  refunds_count: number;
  refunds_total: number;
  fees_total: number;
  adjustments_total: number;
  net_amount: number;
  settlement_id: string | null;
  unlock_date: string | null;
  transaction_count: number;
  marketplace_name: string | null;
  currency_code: string;
  created_at: string;
  updated_at: string;
}

export const useAmazonDailySummary = (startDate?: Date, endDate?: Date) => {
  const { user } = useAuth();
  const [dailySummaries, setDailySummaries] = useState<AmazonDailySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDailySummaries = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("amazon_transactions_daily_summary")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (startDate) {
        query = query.gte("transaction_date", startDate.toISOString().split('T')[0]);
      }

      if (endDate) {
        query = query.lte("transaction_date", endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching Amazon daily summaries:", error);
        return;
      }

      setDailySummaries(data || []);
    } catch (error) {
      console.error("Error fetching Amazon daily summaries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailySummaries();

    // Set up realtime subscription for summary changes
    const channel = supabase
      .channel('amazon-daily-summary-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'amazon_transactions_daily_summary'
        },
        (payload) => {
          console.log('Amazon daily summary change detected:', payload);
          fetchDailySummaries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, startDate, endDate]);

  return {
    dailySummaries,
    isLoading,
    refetch: fetchDailySummaries
  };
};
