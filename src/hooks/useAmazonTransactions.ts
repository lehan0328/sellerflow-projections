import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AmazonTransaction {
  id: string;
  user_id: string;
  amazon_account_id: string;
  transaction_id: string;
  transaction_type: string;
  transaction_date: string;
  amount: number;
  currency_code: string;
  settlement_id: string | null;
  order_id: string | null;
  sku: string | null;
  marketplace_name: string | null;
  description: string | null;
  fee_description: string | null;
  fee_type: string | null;
  gross_amount: number | null;
  delivery_date: string | null;
  shipping_cost: number | null;
  ads_cost: number | null;
  return_rate: number | null;
  chargeback_rate: number | null;
  net_amount: number | null;
  unlock_date: string | null;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

export const useAmazonTransactions = () => {
  const { user } = useAuth();
  const [amazonTransactions, setAmazonTransactions] = useState<AmazonTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAmazonTransactions = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch transaction count first
      const { count, error: countError } = await supabase
        .from("amazon_transactions")
        .select("*", { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error("Error fetching transaction count:", countError);
      } else {
        console.log(`📊 Total Amazon transactions in DB: ${count}`);
      }

      // Fetch recent transactions with limit to prevent timeout
      const { data, error } = await supabase
        .from("amazon_transactions")
        .select("*")
        .eq('user_id', user.id)
        .order("transaction_date", { ascending: false })
        .limit(1000); // Limit to most recent 1000 transactions for display

      if (error) {
        console.error("Error fetching Amazon transactions:", error);
        return;
      }

      setAmazonTransactions(data || []);
    } catch (error) {
      console.error("Error fetching Amazon transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAmazonTransactions();

    // Set up realtime subscription for transaction changes
    const channel = supabase
      .channel('amazon-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'amazon_transactions'
        },
        (payload) => {
          console.log('Amazon transaction change detected:', payload);
          fetchAmazonTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    amazonTransactions,
    isLoading,
    refetch: fetchAmazonTransactions
  };
};
