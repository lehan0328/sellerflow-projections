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

      // Track running balance day-by-day to match calendar's total projected cash
      const dailyBalances: DailyBalance[] = [];
      let runningBalance = bankBalance;

      for (let i = 1; i <= 180; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + i);
        targetDate.setHours(0, 0, 0, 0);
        const targetDateStr = formatDate(targetDate);

        let dayNetChange = 0;

        // 1. Process transactions for this specific day only
        transactionsResult.data?.forEach((tx) => {
          const txDateStr = tx.due_date || tx.transaction_date;
          const txDate = new Date(txDateStr);
          txDate.setHours(0, 0, 0, 0);
          
          if (txDate.getTime() === targetDate.getTime()) {
            if (tx.status === 'partially_paid') return;
            
            if (tx.type === 'sales_order' || tx.type === 'customer_payment') {
              dayNetChange += Number(tx.amount);
            } else if (tx.type === 'purchase_order' || tx.type === 'expense' || tx.vendor_id) {
              dayNetChange -= Number(tx.amount);
            }
          }
        });

        // 2. Process income for this specific day only (exclude received)
        incomeResult.data?.forEach((income) => {
          if (income.status === 'received') return;
          const incomeDate = new Date(income.payment_date);
          incomeDate.setHours(0, 0, 0, 0);
          if (incomeDate.getTime() === targetDate.getTime()) {
            dayNetChange += Number(income.amount);
          }
        });

        // 3. Process Amazon payouts for this specific day only
        amazonResult.data?.forEach((payout) => {
          const payoutDate = new Date(payout.payout_date);
          payoutDate.setHours(0, 0, 0, 0);
          if (payoutDate.getTime() === targetDate.getTime()) {
            dayNetChange += Number(payout.total_amount);
          }
        });

        // 4. Process recurring expenses/income for this specific day only
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
            targetDate,
            targetDate
          );
          
          if (occurrences.length > 0) {
            if (recurring.type === 'income') {
              dayNetChange += Number(recurring.amount);
            } else {
              dayNetChange -= Number(recurring.amount);
            }
          }
        });

        // 5. Process vendor payments for this specific day only
        vendorsResult.data?.forEach((vendor) => {
          if (vendor.status === 'paid' || !vendor.next_payment_date || Number(vendor.total_owed || 0) <= 0) return;
          
          const vendorDate = new Date(vendor.next_payment_date);
          vendorDate.setHours(0, 0, 0, 0);
          if (vendorDate.getTime() === targetDate.getTime()) {
            dayNetChange -= Number(vendor.next_payment_amount || 0);
          }
        });

        // Update running balance
        runningBalance += dayNetChange;

        dailyBalances.push({
          date: targetDateStr,
          balance: runningBalance
        });

        // Log first few days for debugging
        if (i <= 5) {
          console.log(`💰 Day ${i} (${targetDateStr}):`, {
            dayNetChange: dayNetChange.toFixed(2),
            runningBalance: runningBalance.toFixed(2)
          });
        }
      }

      // Find lowest balance for safe spending calculation
      const lowestBalance = dailyBalances.reduce((min, day) =>
        day.balance < min.balance ? day : min,
        dailyBalances[0] || { date: todayStr, balance: bankBalance }
      );

      // Calculate safe spending limit first
      const safeSpendingLimit = Math.max(0, lowestBalance.balance - reserve);
      
      // Find the FIRST day balance goes below the safe spending limit
      const firstBelowLimitDay = dailyBalances.find(day => day.balance < safeSpendingLimit);
      const willGoNegative = firstBelowLimitDay !== undefined;

      console.log('💰 Safe Spending Final Calculation:', {
        bankBalance,
        reserve,
        lowestBalance: lowestBalance.balance.toFixed(2),
        lowestDate: lowestBalance.date,
        safeSpendingLimit: safeSpendingLimit.toFixed(2),
        willGoNegative,
        firstBelowLimitDate: firstBelowLimitDay?.date || null,
        firstBelowLimitAmount: firstBelowLimitDay?.balance.toFixed(2) || null,
        calculation: `${lowestBalance.balance.toFixed(2)} - ${reserve.toFixed(2)} = ${safeSpendingLimit.toFixed(2)}`
      });

      setData({
        safe_spending_limit: safeSpendingLimit,
        reserve_amount: reserve,
        will_go_negative: willGoNegative,
        negative_date: willGoNegative ? firstBelowLimitDay!.date : null,
        calculation: {
          available_balance: bankBalance,
          lowest_projected_balance: willGoNegative ? firstBelowLimitDay!.balance : lowestBalance.balance,
          lowest_balance_date: willGoNegative ? firstBelowLimitDay!.date : lowestBalance.date
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
