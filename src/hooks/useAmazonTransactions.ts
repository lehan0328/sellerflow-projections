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
      // Fetch ALL transactions (no date filter for test page)
      const { data, error } = await supabase
        .from("amazon_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

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
  }, [user]);

  return {
    amazonTransactions,
    isLoading,
    refetch: fetchAmazonTransactions
  };
};
