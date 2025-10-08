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

  // Parse a date string (YYYY-MM-DD or ISO) to a local Date at start of day to avoid timezone drift
  const parseLocalDate = (dateStr: string): Date => {
    const [y, m, d] = (dateStr.includes('T') ? dateStr.split('T')[0] : dateStr).split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setHours(0, 0, 0, 0);
    return dt;
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

      console.log('💰 STARTING Safe Spending Calculation:', {
        bankBalance,
        reserve,
        startDate: todayStr
      });

      // Simple calculation: Track Total Projected Cash for each day, find minimum, subtract reserve
      const dailyBalances: DailyBalance[] = [];
      let runningBalance = bankBalance;

      // Process each day in the next 180 days
      for (let i = 0; i <= 180; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + i);
        targetDate.setHours(0, 0, 0, 0);
        const targetDateStr = formatDate(targetDate);

        let dayChange = 0;

        // Add all inflows for this day
        transactionsResult.data?.forEach((tx) => {
          const txDate = parseLocalDate(tx.due_date || tx.transaction_date);
          if (txDate.getTime() === targetDate.getTime() && tx.status !== 'partially_paid') {
            if (tx.type === 'sales_order' || tx.type === 'customer_payment') {
              dayChange += Number(tx.amount);
            } else if (tx.type === 'purchase_order' || tx.type === 'expense' || tx.vendor_id) {
              dayChange -= Number(tx.amount);
            }
          }
        });

        incomeResult.data?.forEach((income) => {
          if (income.status !== 'received') {
            const incomeDate = parseLocalDate(income.payment_date);
            if (incomeDate.getTime() === targetDate.getTime()) {
              dayChange += Number(income.amount);
            }
          }
        });

        amazonResult.data?.forEach((payout) => {
          const payoutDate = parseLocalDate(payout.payout_date);
          if (payoutDate.getTime() === targetDate.getTime()) {
            dayChange += Number(payout.total_amount);
          }
        });

        recurringResult.data?.forEach((recurring) => {
          if (recurring.is_active) {
            const occurrences = generateRecurringDates(
              {
                id: recurring.id,
                transaction_name: recurring.name,
                amount: recurring.amount,
                frequency: recurring.frequency as any,
                start_date: recurring.start_date,
                end_date: recurring.end_date,
                is_active: recurring.is_active,
                type: recurring.type as any
              },
              targetDate,
              targetDate
            );
            if (occurrences.length > 0) {
              dayChange += recurring.type === 'income' ? Number(recurring.amount) : -Number(recurring.amount);
            }
          }
        });

        vendorsResult.data?.forEach((vendor) => {
          if (vendor.status !== 'paid' && Number(vendor.total_owed || 0) > 0) {
            if (vendor.payment_schedule && Array.isArray(vendor.payment_schedule)) {
              vendor.payment_schedule.forEach((payment: any) => {
                const paymentDate = parseLocalDate(payment.date);
                if (paymentDate.getTime() === targetDate.getTime()) {
                  dayChange -= Number(payment.amount || 0);
                }
              });
            } else if (vendor.next_payment_date) {
              const vendorDate = parseLocalDate(vendor.next_payment_date);
              if (vendorDate.getTime() === targetDate.getTime()) {
                dayChange -= Number(vendor.next_payment_amount || 0);
              }
            }
          }
        });

        runningBalance += dayChange;
        dailyBalances.push({ date: targetDateStr, balance: runningBalance });
      }

      // Find minimum balance
      const minBalance = Math.min(...dailyBalances.map(d => d.balance));
      const minDay = dailyBalances.find(d => d.balance === minBalance)!;
      
      // Safe Spending = Min Balance - Reserve
      const safeSpendingLimit = Math.max(0, minBalance - reserve);

      console.log('💰 Safe Spending Result:', {
        minBalance: minBalance.toFixed(2),
        minDate: minDay.date,
        reserve,
        safeSpendingLimit: safeSpendingLimit.toFixed(2),
        formula: `${minBalance.toFixed(2)} - ${reserve} = ${safeSpendingLimit.toFixed(2)}`
      });
      
      // Find the FIRST day balance goes below safe spending limit (SSL)
      const firstBelowLimitDay = dailyBalances.find(day => day.balance < safeSpendingLimit);
      
      // Find the FIRST day balance goes negative (< 0)
      const firstNegativeDay = dailyBalances.find(day => day.balance < 0);
      
      // Determine the warning state
      const willGoNegative = firstNegativeDay !== undefined;
      const willDropBelowLimit = firstBelowLimitDay !== undefined && !willGoNegative;
      
      console.log('💰 Safe Spending Final Calculation:', {
        bankBalance,
        reserve,
        minBalance: minBalance.toFixed(2),
        minDate: minDay.date,
        safeSpendingLimit: safeSpendingLimit.toFixed(2),
        willGoNegative,
        willDropBelowLimit,
        firstNegativeDate: firstNegativeDay?.date || null,
        firstNegativeAmount: firstNegativeDay?.balance.toFixed(2) || null,
        firstBelowLimitDate: firstBelowLimitDay?.date || null,
        firstBelowLimitAmount: firstBelowLimitDay?.balance.toFixed(2) || null,
        calculation: `${minBalance.toFixed(2)} - ${reserve.toFixed(2)} = ${safeSpendingLimit.toFixed(2)}`
      });

      setData({
        safe_spending_limit: safeSpendingLimit,
        reserve_amount: reserve,
        will_go_negative: willGoNegative || willDropBelowLimit,
        negative_date: willGoNegative 
          ? firstNegativeDay!.date 
          : (willDropBelowLimit ? firstBelowLimitDay!.date : null),
        calculation: {
          available_balance: bankBalance,
          lowest_projected_balance: willGoNegative 
            ? firstNegativeDay!.balance 
            : (willDropBelowLimit ? firstBelowLimitDay!.balance : minBalance),
          lowest_balance_date: willGoNegative 
            ? firstNegativeDay!.date 
            : (willDropBelowLimit ? firstBelowLimitDay!.date : minDay.date)
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
