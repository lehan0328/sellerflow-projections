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

      // Get ALL events that affect cash flow (matching calendar logic)
      const [transactionsResult, incomeResult, recurringResult, vendorsResult, amazonResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('transaction_date', todayStr)
          .lte('transaction_date', futureDateStr),
        
        supabase
          .from('income')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('payment_date', todayStr)
          .lte('payment_date', futureDateStr),
        
        supabase
          .from('recurring_expenses')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true),
        
        supabase
          .from('vendors')
          .select('*')
          .eq('user_id', session.user.id),
        
        supabase
          .from('amazon_payouts')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('payout_date', todayStr)
          .lte('payout_date', futureDateStr)
      ]);

      console.log('📊 Fetched data:', {
        transactions: transactionsResult.data?.length || 0,
        income: incomeResult.data?.length || 0,
        recurring: recurringResult.data?.length || 0,
        vendors: vendorsResult.data?.length || 0,
        amazonPayouts: amazonResult.data?.length || 0
      });

      // Project balance for next 180 days (matching calendar's getTotalCashForDay)
      const dailyBalances: DailyBalance[] = [];

      for (let i = 1; i <= 180; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + i);
        targetDate.setHours(0, 0, 0, 0);
        const targetDateStr = formatDate(targetDate);

        let netChange = 0;

        // 1. Add transactions up to target date
        transactionsResult.data?.forEach((tx) => {
          const txDate = new Date(tx.transaction_date);
          txDate.setHours(0, 0, 0, 0);
          if (txDate <= targetDate) {
            if (tx.type === 'sales_order' || tx.type === 'customer_payment') {
              netChange += Number(tx.amount);
            } else if (tx.type === 'purchase_order' || tx.type === 'expense') {
              netChange -= Number(tx.amount);
            }
          }
        });

        // 2. Add income up to target date
        incomeResult.data?.forEach((income) => {
          const incomeDate = new Date(income.payment_date);
          incomeDate.setHours(0, 0, 0, 0);
          if (incomeDate <= targetDate) {
            netChange += Number(income.amount);
          }
        });

        // 3. Add Amazon payouts up to target date
        amazonResult.data?.forEach((payout) => {
          const payoutDate = new Date(payout.payout_date);
          payoutDate.setHours(0, 0, 0, 0);
          if (payoutDate <= targetDate) {
            netChange += Number(payout.total_amount);
          }
        });

        // 4. Add/subtract recurring expenses up to target date
        recurringResult.data?.forEach((recurring) => {
          const startDate = new Date(recurring.start_date);
          const endDate = recurring.end_date ? new Date(recurring.end_date) : targetDate;
          
          // Simple recurring logic - proper implementation would use generateRecurringDates
          // For now, just check if this is a recurring date
          // This is simplified - full implementation would need the generateRecurringDates function
          if (recurring.type === 'income') {
            // Add recurring income (simplified)
          } else {
            // Subtract recurring expense (simplified)
          }
        });

        // 5. Subtract vendor payments up to target date
        vendorsResult.data?.forEach((vendor) => {
          if (vendor.next_payment_date) {
            const vendorDate = new Date(vendor.next_payment_date);
            vendorDate.setHours(0, 0, 0, 0);
            if (vendorDate <= targetDate) {
              netChange -= Number(vendor.next_payment_amount || 0);
            }
          }
        });

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amazon_payouts' }, fetchSafeSpending)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { data, isLoading, error, reserveAmount, updateReserveAmount, refetch: fetchSafeSpending };
};
