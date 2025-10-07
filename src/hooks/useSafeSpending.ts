import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateRecurringDates } from "@/lib/recurringDates";

interface SafeSpendingData {
  safe_spending_limit: number;
  reserve_amount: number;
  calculation: {
    available_balance: number;
    lowest_projected_balance: number;
    lowest_balance_date: string;
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

      // Calculate projected cash flow for next 180 days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 180);

      // Get all transactions in next 180 days
      const { data: futureTransactions } = await supabase
        .from('transactions')
        .select('amount, type, transaction_date')
        .eq('user_id', session.user.id)
        .gte('transaction_date', today.toISOString())
        .lte('transaction_date', endDate.toISOString());

      // Get all income in next 180 days
      const { data: futureIncome } = await supabase
        .from('income')
        .select('amount, payment_date')
        .eq('user_id', session.user.id)
        .gte('payment_date', today.toISOString())
        .lte('payment_date', endDate.toISOString());

      // Get recurring expenses
      const { data: recurringExpenses } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      // Get Amazon payouts
      const { data: amazonPayouts } = await supabase
        .from('amazon_payouts')
        .select('total_amount, payout_date')
        .eq('user_id', session.user.id)
        .gte('payout_date', today.toISOString())
        .lte('payout_date', endDate.toISOString());

      // Build daily cash flow projection
      const dailyBalances: { date: Date; balance: number }[] = [];
      let runningBalance = availableBalance;

      for (let i = 0; i <= 180; i++) {
        const currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];

        let dailyChange = 0;

        // Add income
        futureIncome?.forEach(income => {
          const incomeDate = new Date(income.payment_date).toISOString().split('T')[0];
          if (incomeDate === dateStr) {
            dailyChange += Number(income.amount);
          }
        });

        // Add Amazon payouts
        amazonPayouts?.forEach(payout => {
          const payoutDate = new Date(payout.payout_date).toISOString().split('T')[0];
          if (payoutDate === dateStr) {
            dailyChange += Number(payout.total_amount);
          }
        });

        // Subtract transactions (expenses and purchase orders)
        futureTransactions?.forEach(tx => {
          const txDate = new Date(tx.transaction_date).toISOString().split('T')[0];
          if (txDate === dateStr) {
            if (tx.type === 'purchase-order' || tx.type === 'expense') {
              dailyChange -= Math.abs(Number(tx.amount));
            }
          }
        });

        // Handle recurring expenses
        recurringExpenses?.forEach(expense => {
          const dates = generateRecurringDates(
            {
              ...expense,
              frequency: expense.frequency as any,
              type: expense.type as 'expense' | 'income',
            },
            today,
            endDate
          );
          
          dates.forEach(date => {
            const recurringDateStr = date.toISOString().split('T')[0];
            if (recurringDateStr === dateStr) {
              if (expense.type === 'expense') {
                dailyChange -= Math.abs(Number(expense.amount));
              } else {
                dailyChange += Number(expense.amount);
              }
            }
          });
        });

        runningBalance += dailyChange;
        dailyBalances.push({ date: currentDate, balance: runningBalance });
      }

      // Find the lowest projected balance
      const lowestBalance = dailyBalances.reduce((min, day) => 
        day.balance < min.balance ? day : min
      );

      // Safe spending = Lowest Projected Balance - Reserve Amount
      const safeSpendingLimit = Math.max(0, lowestBalance.balance - userReserve);

      setData({
        safe_spending_limit: safeSpendingLimit,
        reserve_amount: userReserve,
        calculation: {
          available_balance: availableBalance,
          lowest_projected_balance: lowestBalance.balance,
          lowest_balance_date: lowestBalance.date.toISOString().split('T')[0],
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
