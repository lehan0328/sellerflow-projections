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

// Helper to calculate monthly amount from recurring frequency
const getMonthlyRecurringAmount = (amount: number, frequency: string): number => {
  switch (frequency) {
    case 'daily': return amount * 30;
    case 'weekly': return amount * 4;
    case 'bi-weekly': return amount * 2;
    case 'monthly': return amount;
    case '2-months': return amount * 0.5;
    case '3-months': return amount * 0.33;
    case 'weekdays': return amount * 22;
    default: return amount;
  }
};

export const useCreditCards = () => {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [creditCardPendingAmounts, setCreditCardPendingAmounts] = useState<Map<string, number>>(new Map());
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
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching credit cards:", error);
        toast.error("Failed to fetch credit cards");
        return;
      }

      setCreditCards((data || []) as CreditCard[]);
      
      // Fetch pending commitments for each card
      if (data && data.length > 0) {
        await fetchPendingCommitments(data.map(card => card.id));
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch credit cards");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingCommitments = async (cardIds: string[]) => {
    if (!user || cardIds.length === 0) return;

    try {
      // Fetch pending transactions (purchase orders and expenses)
      const { data: pendingTransactions, error: txError } = await supabase
        .from("transactions")
        .select("credit_card_id, amount")
        .in("credit_card_id", cardIds)
        .eq("status", "pending")
        .in("type", ["purchase_order", "expense"]);

      if (txError) {
        console.error("Error fetching pending transactions:", txError);
        return;
      }

      // Fetch active recurring expenses on credit cards
      const { data: recurringExpenses, error: recurringError } = await supabase
        .from("recurring_expenses")
        .select("credit_card_id, amount, frequency")
        .in("credit_card_id", cardIds)
        .eq("is_active", true)
        .eq("type", "expense");

      if (recurringError) {
        console.error("Error fetching recurring expenses:", recurringError);
        return;
      }

      // Calculate total pending for each card
      const pendingMap = new Map<string, number>();
      
      // Add pending transactions
      pendingTransactions?.forEach(tx => {
        if (tx.credit_card_id) {
          const current = pendingMap.get(tx.credit_card_id) || 0;
          pendingMap.set(tx.credit_card_id, current + Math.abs(tx.amount));
        }
      });

      // Add monthly equivalent of recurring expenses
      recurringExpenses?.forEach(expense => {
        if (expense.credit_card_id) {
          const current = pendingMap.get(expense.credit_card_id) || 0;
          const monthlyAmount = getMonthlyRecurringAmount(Math.abs(expense.amount), expense.frequency);
          pendingMap.set(expense.credit_card_id, current + monthlyAmount);
        }
      });

      setCreditCardPendingAmounts(pendingMap);
    } catch (error) {
      console.error("Error fetching pending commitments:", error);
    }
  };

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

      await fetchCreditCards();
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

  const totalCreditLimit = creditCards.reduce((sum, card) => {
    const effectiveLimit = card.credit_limit_override || card.credit_limit;
    return sum + effectiveLimit;
  }, 0);
  const totalBalance = creditCards.reduce((sum, card) => sum + card.balance, 0);
  const totalAvailableCredit = creditCards.reduce((sum, card) => {
    const effectiveLimit = card.credit_limit_override || card.credit_limit;
    return sum + (effectiveLimit - card.balance);
  }, 0);

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
    creditCardPendingAmounts,
    addCreditCard,
    updateCreditCard,
    removeCreditCard,
    syncCreditCard,
    refetch: fetchCreditCards,
  };
};