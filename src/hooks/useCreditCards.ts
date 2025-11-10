import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface CreditCard {
  id: string;
  user_id: string;
  institution_name: string;
  account_name: string;
  account_type: string;
  masked_account_number?: string;
  balance: number;
  statement_balance: number;
  credit_limit: number;
  credit_limit_override?: number;
  available_credit: number;
  currency_code: string;
  plaid_account_id?: string;
  minimum_payment: number;
  payment_due_date?: string;
  statement_close_date?: string;
  annual_fee: number;
  cash_back: number;
  priority: number;
  nickname?: string;
  forecast_next_month: boolean;
  pay_minimum: boolean;
  last_sync: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCreditCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const fetchCreditCards = async (): Promise<CreditCard[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("credit_cards")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching credit cards:", error);
      toast.error("Failed to fetch credit cards");
      return [];
    }

    return (data || []) as CreditCard[];
  };

  // Use React Query with 30-minute staleTime (credit cards rarely change)
  const { data: creditCards = [], isLoading, refetch } = useQuery({
    queryKey: ['credit-cards', user?.id],
    queryFn: fetchCreditCards,
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const addCreditCard = async (cardData: Omit<CreditCard, "id" | "created_at" | "updated_at" | "user_id" | "masked_account_number">) => {
    if (!user) {
      toast.error("You must be logged in to add credit cards");
      return false;
    }

    try {
      const { error } = await supabase
        .from("credit_cards")
        .insert({
          user_id: user.id,
          ...cardData,
          last_sync: new Date().toISOString()
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
      // Convert empty strings to null for date fields
      const sanitizedUpdates = {
        ...updates,
        payment_due_date: updates.payment_due_date === '' ? null : updates.payment_due_date,
        statement_close_date: updates.statement_close_date === '' ? null : updates.statement_close_date,
      };

      const { error } = await supabase
        .from("credit_cards")
        .update(sanitizedUpdates)
        .eq("id", cardId);

      if (error) {
        console.error("Error updating credit card:", error);
        toast.error("Failed to update credit card");
        return false;
      }

      await queryClient.invalidateQueries({ queryKey: ['credit-cards', user.id] });
      toast.success("Credit card updated successfully");
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
      // Check for pending purchase orders linked to this card
      const { data: pendingOrders, error: checkError } = await supabase
        .from("transactions")
        .select("id, description, amount, due_date")
        .eq("credit_card_id", cardId)
        .eq("type", "purchase_order")
        .in("status", ["pending", "partial"])
        .order("due_date", { ascending: true });

      if (checkError) {
        console.error("Error checking for pending orders:", checkError);
        toast.error("Failed to verify purchase orders");
        return false;
      }

      if (pendingOrders && pendingOrders.length > 0) {
        const totalAmount = pendingOrders.reduce((sum, order) => sum + Number(order.amount), 0);
        toast.error(
          `Cannot delete card: ${pendingOrders.length} pending purchase order${pendingOrders.length !== 1 ? 's' : ''} (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)}) are linked to this card. Please complete or reassign these orders first.`,
          { duration: 6000 }
        );
        return { blocked: true, orders: pendingOrders };
      }

      const { error } = await supabase
        .from("credit_cards")
        .delete()
        .eq("id", cardId);

      if (error) {
        console.error("Error removing credit card:", error);
        toast.error("Failed to remove credit card");
        return false;
      }

      await queryClient.invalidateQueries({ queryKey: ['credit-cards', user.id] });
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

  const totalCreditLimit = creditCards.reduce((sum, card) => {
    const effectiveLimit = card.credit_limit_override || card.credit_limit;
    return sum + effectiveLimit;
  }, 0);
  const totalBalance = creditCards.reduce((sum, card) => sum + card.balance, 0);
  const totalAvailableCredit = creditCards.reduce((sum, card) => {
    const effectiveLimit = card.credit_limit_override || card.credit_limit;
    return sum + (effectiveLimit - card.balance);
  }, 0);

  // Set up debounced real-time updates
  useEffect(() => {
    if (!user) return;

    const debouncedRefetch = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Wait 3 seconds before refetching (credit cards rarely change)
      debounceTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['credit-cards', user.id],
          exact: true 
        });
      }, 3000);
    };

    const channel = supabase
      .channel('credit-cards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_cards',
        },
        debouncedRefetch
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

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
    refetch,
  };
};