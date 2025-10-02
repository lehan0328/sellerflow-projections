import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CreditCard {
  id: string;
  user_id: string;
  institution_name: string;
  account_name: string;
  account_type: string;
  masked_account_number?: string;
  balance: number;
  credit_limit: number;
  available_credit: number;
  currency_code: string;
  plaid_account_id?: string;
  minimum_payment: number;
  payment_due_date?: string;
  statement_close_date?: string;
  annual_fee: number;
  cash_back: number;
  priority: number;
  last_sync: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCreditCards = () => {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchCreditCards = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching credit cards:", error);
        toast.error("Failed to fetch credit cards");
        return;
      }

      setCreditCards((data || []) as CreditCard[]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch credit cards");
    } finally {
      setIsLoading(false);
    }
  };

  const addCreditCard = async (cardData: Omit<CreditCard, "id" | "created_at" | "updated_at" | "user_id" | "masked_account_number">) => {
    if (!user) {
      toast.error("You must be logged in to add credit cards");
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('insert_secure_credit_card', {
        p_institution_name: cardData.institution_name,
        p_account_name: cardData.account_name,
        p_account_type: cardData.account_type || 'credit',
        p_balance: cardData.balance,
        p_credit_limit: cardData.credit_limit,
        p_available_credit: cardData.available_credit,
        p_currency_code: cardData.currency_code || 'USD',
        p_plaid_account_id: cardData.plaid_account_id,
        p_minimum_payment: cardData.minimum_payment,
        p_payment_due_date: cardData.payment_due_date,
        p_statement_close_date: cardData.statement_close_date,
        p_annual_fee: cardData.annual_fee,
        p_cash_back: cardData.cash_back,
        p_priority: cardData.priority
      });

      if (error) {
        console.error("Error adding credit card:", error);
        toast.error("Failed to add credit card");
        return false;
      }

      await fetchCreditCards();
      toast.success("Credit card added successfully!");
      return true;
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to add credit card");
      return false;
    }
  };

  const updateCreditCard = async (cardId: string, updates: Partial<CreditCard>) => {
    if (!user) {
      toast.error("You must be logged in to update credit cards");
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('update_secure_credit_card', {
        p_card_id: cardId,
        p_institution_name: updates.institution_name,
        p_account_name: updates.account_name,
        p_account_type: updates.account_type,
        p_balance: updates.balance,
        p_credit_limit: updates.credit_limit,
        p_available_credit: updates.available_credit,
        p_currency_code: updates.currency_code,
        p_plaid_account_id: updates.plaid_account_id,
        p_minimum_payment: updates.minimum_payment,
        p_payment_due_date: updates.payment_due_date,
        p_statement_close_date: updates.statement_close_date,
        p_annual_fee: updates.annual_fee,
        p_cash_back: updates.cash_back,
        p_priority: updates.priority
      });

      if (error) {
        console.error("Error updating credit card:", error);
        toast.error("Failed to update credit card");
        return false;
      }

      await fetchCreditCards();
      return true;
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to update credit card");
      return false;
    }
  };

  const removeCreditCard = async (cardId: string) => {
    if (!user) {
      toast.error("You must be logged in to remove credit cards");
      return false;
    }

    try {
      const { error } = await supabase
        .from("credit_cards")
        .update({ is_active: false })
        .eq("id", cardId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing credit card:", error);
        toast.error("Failed to remove credit card");
        return false;
      }

      setCreditCards(prev => prev.filter(card => card.id !== cardId));
      toast.success("Credit card removed successfully!");
      return true;
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to remove credit card");
      return false;
    }
  };

  const syncCreditCard = async (cardId: string) => {
    return await updateCreditCard(cardId, { 
      last_sync: new Date().toISOString()
    });
  };

  const totalCreditLimit = creditCards.reduce((sum, card) => sum + card.credit_limit, 0);
  const totalBalance = creditCards.reduce((sum, card) => sum + card.balance, 0);
  const totalAvailableCredit = creditCards.reduce((sum, card) => sum + card.available_credit, 0);

  useEffect(() => {
    fetchCreditCards();
  }, [user]);

  // Set up real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('credit-cards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_cards',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCreditCards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    creditCards,
    isLoading,
    totalCreditLimit,
    totalBalance,
    totalAvailableCredit,
    addCreditCard,
    updateCreditCard,
    removeCreditCard,
    syncCreditCard,
    refetch: fetchCreditCards,
  };
};