import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { addDays } from "date-fns";
import { generateRecurringDates } from "@/lib/recurringDates";
import { useEffect, useMemo } from "react";
import { creditCardsQueryKey } from "@/lib/cacheConfig";
import { useTransactions } from "./useTransactions";
import { useRecurringExpenses } from "./useRecurringExpenses";

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

  // Fetch credit cards with React Query
  const { data: creditCards = [], isLoading } = useQuery({
    queryKey: creditCardsQueryKey(user?.id),
    enabled: !!user,
    staleTime: 15 * 60 * 1000, // 15 minutes - credit cards don't change frequently
    gcTime: 30 * 60 * 1000,    // 30 minutes - keep in cache longer
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching credit cards:", error);
        toast.error("Failed to fetch credit cards");
        throw error;
      }

      return (data || []) as CreditCard[];
    },
  });

  // Get cached transactions and recurring expenses
  const { transactions } = useTransactions();
  const { recurringExpenses } = useRecurringExpenses();

  // Calculate pending amounts from cached hooks
  const creditCardPendingAmounts = useMemo(() => {
    if (!creditCards || creditCards.length === 0 || !transactions || !recurringExpenses) {
      return new Map<string, number>();
    }

    const pendingMap = new Map<string, number>();
    const cardIds = creditCards.map(c => c.id);

    // Add pending transactions
    transactions
      .filter(tx => 
        tx.creditCardId && 
        cardIds.includes(tx.creditCardId) &&
        tx.status === 'pending' && 
        (tx.type === 'purchase_order' || tx.type === 'expense')
      )
      .forEach(tx => {
        const current = pendingMap.get(tx.creditCardId!) || 0;
        pendingMap.set(tx.creditCardId!, current + tx.amount);
      });

    // Calculate recurring expense occurrences in next 30 days
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    recurringExpenses
      .filter(expense => 
        expense.credit_card_id && 
        cardIds.includes(expense.credit_card_id) &&
        expense.is_active && 
        expense.type === 'expense'
      )
      .forEach(expense => {
        const recurringTx = {
          id: expense.id,
          transaction_name: expense.transaction_name || expense.name,
          amount: expense.amount,
          frequency: expense.frequency as any,
          start_date: expense.start_date || today.toISOString().split('T')[0],
          end_date: expense.end_date,
          is_active: true,
          type: 'expense' as const
        };
        
        const occurrences = generateRecurringDates(recurringTx, today, thirtyDaysFromNow);
        const totalAmount = occurrences.length * expense.amount;
        
        const current = pendingMap.get(expense.credit_card_id!) || 0;
        pendingMap.set(expense.credit_card_id!, current + totalAmount);
      });

    return pendingMap;
  }, [creditCards, transactions, recurringExpenses]);

  // Add credit card mutation
  const addCreditCardMutation = useMutation({
    mutationFn: async (cardData: Omit<CreditCard, "id" | "created_at" | "updated_at" | "user_id" | "masked_account_number">) => {
      if (!user) throw new Error("You must be logged in to add credit cards");

      const { error } = await supabase
        .from("credit_cards")
        .insert({
          user_id: user.id,
          ...cardData,
          last_sync: new Date().toISOString()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditCardsQueryKey(user?.id) });
      toast.success("Credit card added successfully!");
    },
    onError: (error) => {
      console.error("Error adding credit card:", error);
      toast.error("Failed to add credit card");
    }
  });

  // Update credit card mutation
  const updateCreditCardMutation = useMutation({
    mutationFn: async ({ cardId, updates }: { cardId: string; updates: Partial<CreditCard> }) => {
      if (!user) throw new Error("You must be logged in to update credit cards");

      // Convert empty strings to null for date fields
      const sanitizedUpdates = {
        ...updates,
        payment_due_date: updates.payment_due_date === '' ? null : updates.payment_due_date,
        statement_close_date: updates.statement_close_date === '' ? null : updates.statement_close_date,
      };

      // If credit_limit_override is being updated, recalculate available_credit
      if ('credit_limit_override' in updates) {
        const card = creditCards.find(c => c.id === cardId);
        if (card) {
          const effectiveLimit = updates.credit_limit_override ?? card.credit_limit;
          sanitizedUpdates.available_credit = effectiveLimit - card.balance;
        }
      }

      const { error} = await supabase
        .from("credit_cards")
        .update(sanitizedUpdates)
        .eq("id", cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditCardsQueryKey(user?.id) });
      toast.success("Credit card updated successfully");
    },
    onError: (error) => {
      console.error("Error updating credit card:", error);
      toast.error("Failed to update credit card");
    }
  });

  // Remove credit card mutation
  const removeCreditCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      if (!user) throw new Error("You must be logged in to remove credit cards");

      const { error } = await supabase
        .from("credit_cards")
        .delete()
        .eq("id", cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditCardsQueryKey(user?.id) });
      toast.success("Credit card removed successfully!");
    },
    onError: (error) => {
      console.error("Error removing credit card:", error);
      toast.error("Failed to remove credit card");
    }
  });

  // Sync credit card mutation
  const syncCreditCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      return updateCreditCardMutation.mutateAsync({ 
        cardId, 
        updates: { last_sync: new Date().toISOString() }
      });
    }
  });

  // Derived calculations (memoized)
  const totalCreditLimit = useMemo(() => 
    creditCards.reduce((sum, card) => {
      const effectiveLimit = card.credit_limit_override || card.credit_limit;
      return sum + effectiveLimit;
    }, 0),
    [creditCards]
  );

  const totalBalance = useMemo(() => 
    creditCards.reduce((sum, card) => sum + card.balance, 0),
    [creditCards]
  );

  const totalAvailableCredit = useMemo(() => 
    creditCards.reduce((sum, card) => {
      const effectiveLimit = card.credit_limit_override || card.credit_limit;
      return sum + (effectiveLimit - card.balance);
    }, 0),
    [creditCards]
  );

  // Real-time subscription
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
          queryClient.invalidateQueries({ queryKey: creditCardsQueryKey(user.id) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    creditCards,
    isLoading,
    totalCreditLimit,
    totalBalance,
    totalAvailableCredit,
    creditCardPendingAmounts,
    addCreditCard: (cardData: Omit<CreditCard, "id" | "created_at" | "updated_at" | "user_id" | "masked_account_number">) => 
      addCreditCardMutation.mutateAsync(cardData),
    updateCreditCard: (cardId: string, updates: Partial<CreditCard>) => 
      updateCreditCardMutation.mutateAsync({ cardId, updates }),
    removeCreditCard: (cardId: string) => 
      removeCreditCardMutation.mutateAsync(cardId),
    syncCreditCard: (cardId: string) => 
      syncCreditCardMutation.mutateAsync(cardId),
    refetch: () => queryClient.invalidateQueries({ queryKey: creditCardsQueryKey(user?.id) }),
  };
};