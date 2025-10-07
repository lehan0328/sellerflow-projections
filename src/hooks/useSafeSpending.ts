import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateRecurringDates } from "@/lib/recurringDates";

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

        // 1. Process ALL transactions (including vendor-linked ones) up to target date
        transactionsResult.data?.forEach((tx) => {
          // Use due_date if available, otherwise transaction_date
          const txDateStr = tx.due_date || tx.transaction_date;
          const txDate = new Date(txDateStr);
          txDate.setHours(0, 0, 0, 0);
          
          if (txDate <= targetDate) {
            // Skip partially_paid parent transactions (they're replaced by split transactions)
            if (tx.status === 'partially_paid') return;
            
            // Inflows: sales orders and customer payments
            if (tx.type === 'sales_order' || tx.type === 'customer_payment') {
              netChange += Number(tx.amount);
            } 
            // Outflows: purchase orders, expenses, and vendor-linked transactions
            else if (tx.type === 'purchase_order' || tx.type === 'expense' || tx.vendor_id) {
              netChange -= Number(tx.amount);
            }
          }
        });

        // 2. Add income up to target date (exclude received)
        incomeResult.data?.forEach((income) => {
          if (income.status === 'received') return;
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

        // 4. Process recurring expenses/income up to target date
        recurringResult.data?.forEach((recurring) => {
          if (!recurring.is_active) return;
          
          const occurrences = generateRecurringDates(
            {
              id: recurring.id,
              transaction_name: recurring.name,
              amount: recurring.amount,
              frequency: recurring.frequency as 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'yearly' | 'weekdays',
              start_date: recurring.start_date,
              end_date: recurring.end_date,
              is_active: recurring.is_active,
              type: recurring.type as 'income' | 'expense'
            },
            today,
            targetDate
          );
          
          occurrences.forEach(() => {
            if (recurring.type === 'income') {
              netChange += Number(recurring.amount);
            } else {
              netChange -= Number(recurring.amount);
            }
          });
        });

        // 5. Subtract vendor payments up to target date (for vendors without transactions)
        vendorsResult.data?.forEach((vendor) => {
          if (vendor.status === 'paid' || !vendor.next_payment_date || Number(vendor.total_owed || 0) <= 0) return;
          
          const vendorDate = new Date(vendor.next_payment_date);
          vendorDate.setHours(0, 0, 0, 0);
          if (vendorDate <= targetDate) {
            netChange -= Number(vendor.next_payment_amount || 0);
          }
        });

        const projectedBalance = bankBalance + netChange;

        dailyBalances.push({
          date: targetDateStr,
          balance: projectedBalance
        });

        // Log first few days for debugging
        if (i <= 3) {
          console.log(`💰 Day ${i} (${targetDateStr}):`, {
            netChange,
            projectedBalance,
            runningTotal: {
              bankBalance,
              totalNetChange: netChange
            }
          });
        }
      }

      // Find lowest balance
      const lowestBalance = dailyBalances.reduce((min, day) =>
        day.balance < min.balance ? day : min,
        dailyBalances[0] || { date: todayStr, balance: bankBalance }
      );

      const willGoNegative = lowestBalance.balance < 0;
      const safeSpendingLimit = willGoNegative ? 0 : Math.max(0, lowestBalance.balance - reserve);

      console.log('💰 Safe Spending Final Calculation:', {
        bankBalance,
        reserve,
        lowestBalance: lowestBalance.balance,
        lowestDate: lowestBalance.date,
        willGoNegative,
        safeSpendingLimit,
        calculation: `${lowestBalance.balance.toFixed(2)} - ${reserve.toFixed(2)} = ${safeSpendingLimit.toFixed(2)}`,
        first5Days: dailyBalances.slice(0, 5).map(d => ({
          date: d.date,
          balance: d.balance.toFixed(2)
        }))
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
