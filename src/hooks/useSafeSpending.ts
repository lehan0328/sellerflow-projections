import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SafeSpendingData {
  safe_spending_limit: number;
  reserve_amount: number;
  will_go_negative: boolean;
  negative_date: string | null;
  calculation: {
    available_balance: number;
    lowest_projected_balance: number;
    lowest_balance_date: string;
  };
}

interface DailyBalance {
  date: string;
  balance: number;
}

export const useSafeSpending = () => {
  const [data, setData] = useState<SafeSpendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reserveAmount, setReserveAmount] = useState(0);

  const formatDate = (date: Date | string): string => {
    if (typeof date === 'string') return date.split('T')[0];
    return date.toISOString().split('T')[0];
  };

  const fetchSafeSpending = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        return;
      }

      // Get user settings for reserve
      const { data: settings } = await supabase
        .from('user_settings')
        .select('safe_spending_reserve')
        .eq('user_id', session.user.id)
        .single();

      const reserve = Number(settings?.safe_spending_reserve || 0);
      setReserveAmount(reserve);

      // Get bank account balance
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      const bankBalance = bankAccounts?.reduce((sum, acc) => sum + Number(acc.balance || 0), 0) || 0;

      // Get ALL events (transactions, income, recurring, vendors, etc.)
      // This should match what the calendar receives
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = formatDate(today);

      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 180);
      const futureDateStr = formatDate(futureDate);

      // Get all transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('transaction_date', todayStr)
        .lte('transaction_date', futureDateStr);

      console.log('📊 Fetched transactions:', transactions?.length || 0);

      // Project balance for next 180 days using calendar logic
      const dailyBalances: DailyBalance[] = [];

      for (let i = 1; i <= 180; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + i);
        targetDate.setHours(0, 0, 0, 0);
        const targetDateStr = formatDate(targetDate);

        // Calculate cumulative net change from all events up to and including target day
        // (This matches getTotalCashForDay from calendar)
        const eventsUpToDay = transactions?.filter((tx) => {
          const txDate = new Date(tx.transaction_date);
          txDate.setHours(0, 0, 0, 0);
          return txDate <= targetDate;
        }) || [];

        const netChange = eventsUpToDay.reduce((total, tx) => {
          if (tx.type === 'sales_order' || tx.type === 'customer_payment') {
            return total + Number(tx.amount);
          } else if (tx.type === 'purchase_order' || tx.type === 'expense') {
            return total - Number(tx.amount);
          }
          return total;
        }, 0);

        const projectedBalance = bankBalance + netChange;

        dailyBalances.push({
          date: targetDateStr,
          balance: projectedBalance
        });
      }

      // Find lowest balance
      const lowestBalance = dailyBalances.reduce((min, day) =>
        day.balance < min.balance ? day : min,
        dailyBalances[0] || { date: todayStr, balance: bankBalance }
      );

      const willGoNegative = lowestBalance.balance < 0;
      const safeSpendingLimit = willGoNegative ? 0 : Math.max(0, lowestBalance.balance - reserve);

      console.log('💰 Safe Spending Calculation:', {
        bankBalance,
        reserve,
        lowestBalance: lowestBalance.balance,
        lowestDate: lowestBalance.date,
        willGoNegative,
        safeSpendingLimit,
        first10Days: dailyBalances.slice(0, 10)
      });

      setData({
        safe_spending_limit: safeSpendingLimit,
        reserve_amount: reserve,
        will_go_negative: willGoNegative,
        negative_date: willGoNegative ? lowestBalance.date : null,
        calculation: {
          available_balance: bankBalance,
          lowest_projected_balance: lowestBalance.balance,
          lowest_balance_date: lowestBalance.date
        }
      });
    } catch (err) {
      console.error("❌ Safe Spending Error:", err);
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

    const channel = supabase
      .channel('safe-spending-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchSafeSpending)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income' }, fetchSafeSpending)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_expenses' }, fetchSafeSpending)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, fetchSafeSpending)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, fetchSafeSpending)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { data, isLoading, error, reserveAmount, updateReserveAmount, refetch: fetchSafeSpending };
};
