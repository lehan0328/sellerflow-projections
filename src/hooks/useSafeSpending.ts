import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SafeSpendingData {
  safe_spending_limit: number;
  reserve_amount: number;
  calculation: {
    available_balance: number;
    upcoming_expenses: number;
    reserve_buffer: number;
  };
}

export const useSafeSpending = () => {
  const [data, setData] = useState<SafeSpendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reserveAmount, setReserveAmount] = useState(0);

  const fetchSafeSpending = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        return;
      }

      // Get user settings
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('safe_spending_reserve, total_cash')
        .eq('user_id', session.user.id)
        .single();

      if (settingsError) throw settingsError;

      const userReserve = settings?.safe_spending_reserve || 0;
      setReserveAmount(userReserve);

      // Get available balance (cash + available credit)
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('balance, available_balance')
        .eq('user_id', session.user.id);

      const { data: creditCards } = await supabase
        .from('credit_cards')
        .select('available_credit')
        .eq('user_id', session.user.id);

      const totalCash = Number(settings?.total_cash || 0);
      const totalAvailableCredit = creditCards?.reduce((sum, card) => sum + Number(card.available_credit || 0), 0) || 0;
      const availableBalance = totalCash + totalAvailableCredit;

      // Calculate upcoming expenses (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: upcomingTransactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', session.user.id)
        .in('type', ['purchase-order', 'expense'])
        .lte('transaction_date', thirtyDaysFromNow.toISOString())
        .gte('transaction_date', new Date().toISOString());

      const { data: recurringExpenses } = await supabase
        .from('recurring_expenses')
        .select('amount, frequency, start_date, end_date')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      // Calculate upcoming expenses from transactions
      let upcomingExpenses = upcomingTransactions?.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

      // Add recurring expenses for next 30 days
      if (recurringExpenses) {
        const now = new Date();
        recurringExpenses.forEach(expense => {
          const startDate = new Date(expense.start_date);
          const endDate = expense.end_date ? new Date(expense.end_date) : thirtyDaysFromNow;
          
          if (startDate <= thirtyDaysFromNow && endDate >= now) {
            let occurrences = 0;
            switch (expense.frequency) {
              case 'daily':
                occurrences = 30;
                break;
              case 'weekly':
                occurrences = 4;
                break;
              case 'bi-weekly':
                occurrences = 2;
                break;
              case 'monthly':
                occurrences = 1;
                break;
              case 'quarterly':
                occurrences = 0.33;
                break;
              case 'yearly':
                occurrences = 0.083;
                break;
            }
            upcomingExpenses += Number(expense.amount) * occurrences;
          }
        });
      }

      // Safe spending = Available - Upcoming Expenses - Reserve Amount
      const safeSpendingLimit = Math.max(0, availableBalance - upcomingExpenses - userReserve);

      setData({
        safe_spending_limit: safeSpendingLimit,
        reserve_amount: userReserve,
        calculation: {
          available_balance: availableBalance,
          upcoming_expenses: upcomingExpenses,
          reserve_buffer: userReserve,
        }
      });
    } catch (err) {
      console.error("Error calculating safe spending:", err);
      setError(err instanceof Error ? err.message : "Failed to calculate safe spending");
    } finally {
      setIsLoading(false);
    }
  };

  const updateReserveAmount = async (newAmount: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error: updateError } = await supabase
        .from('user_settings')
        .update({ safe_spending_reserve: newAmount })
        .eq('user_id', session.user.id);

      if (updateError) throw updateError;

      await fetchSafeSpending();
    } catch (err) {
      console.error("Error updating reserve amount:", err);
    }
  };

  useEffect(() => {
    fetchSafeSpending();
  }, []);

  return { data, isLoading, error, reserveAmount, updateReserveAmount, refetch: fetchSafeSpending };
};
