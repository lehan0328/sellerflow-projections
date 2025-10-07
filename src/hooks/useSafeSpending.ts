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
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      const { data: creditCards } = await supabase
        .from('credit_cards')
        .select('available_credit')
        .eq('user_id', session.user.id);

      // Start from TODAY and project forward (ignore all overdue/pending past items)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const userSettingsCash = Number(settings?.total_cash || 0);
      const bankBalance = bankAccounts?.reduce((sum, acc) => sum + Number(acc.balance || 0), 0) || 0;
      
      // Start with actual cash on hand only (ignore all past transactions)
      // This gives us the true current balance ignoring overdue items
      const totalCash = bankAccounts && bankAccounts.length > 0 
        ? bankBalance 
        : userSettingsCash;
      const totalAvailableCredit = creditCards?.reduce((sum, card) => sum + Number(card.available_credit || 0), 0) || 0;
      const availableBalance = totalCash + totalAvailableCredit;

      // Calculate projected cash flow for next 180 days (ignore overdue items)
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 180);
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get all FUTURE transactions in next 180 days (ignore overdue/past transactions)
      const { data: futureTransactions } = await supabase
        .from('transactions')
        .select('amount, type, transaction_date, status')
        .eq('user_id', session.user.id)
        .gt('transaction_date', todayStr) // Only future dates (not today, not past)
        .lte('transaction_date', endDateStr);

      // Get all FUTURE income in next 180 days (ignore overdue/past income)
      const { data: futureIncome } = await supabase
        .from('income')
        .select('amount, payment_date, status')
        .eq('user_id', session.user.id)
        .gt('payment_date', todayStr) // Only future dates
        .lte('payment_date', endDateStr);

      // Get recurring expenses
      const { data: recurringExpenses } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      // Get FUTURE Amazon payouts only (ignore past payouts)
      const { data: amazonPayouts } = await supabase
        .from('amazon_payouts')
        .select('total_amount, payout_date')
        .eq('user_id', session.user.id)
        .gt('payout_date', todayStr) // Only future dates
        .lte('payout_date', endDateStr);

      // Get vendor payments (from vendors with next_payment_date)
      const { data: vendors } = await supabase
        .from('vendors')
        .select('next_payment_date, next_payment_amount, payment_schedule')
        .eq('user_id', session.user.id)
        .not('next_payment_date', 'is', null);

      console.log('Future data being used:', {
        futureTransactionsCount: futureTransactions?.length || 0,
        futureIncomeCount: futureIncome?.length || 0,
        recurringExpensesCount: recurringExpenses?.length || 0,
        amazonPayoutsCount: amazonPayouts?.length || 0,
        vendorsCount: vendors?.length || 0,
        sampleFutureTransaction: futureTransactions?.[0],
        sampleFutureIncome: futureIncome?.[0],
        sampleVendor: vendors?.[0],
      });

      // Build daily cash flow projection starting from TODAY
      // This represents the lowest cash point we'll hit in the next 180 days
      const dailyBalances: { date: Date; balance: number }[] = [];
      let runningBalance = totalCash; // Start with actual cash (not including credit)

      // Start from day 1 (tomorrow) through day 180
      for (let i = 1; i <= 180; i++) {
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

        // Subtract vendor payments
        vendors?.forEach(vendor => {
          const vendorPaymentDate = new Date(vendor.next_payment_date).toISOString().split('T')[0];
          if (vendorPaymentDate === dateStr) {
            dailyChange -= Math.abs(Number(vendor.next_payment_amount || 0));
          }
        });

        // Process future transactions (both income and expenses)
        futureTransactions?.forEach(tx => {
          const txDate = new Date(tx.transaction_date).toISOString().split('T')[0];
          if (txDate === dateStr) {
            const amount = Number(tx.amount);
            if (tx.type === 'purchase_order' || tx.type === 'expense') {
              dailyChange -= Math.abs(amount);
            } else if (tx.type === 'sales_order' || tx.type === 'customer_payment') {
              dailyChange += Math.abs(amount);
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

      // Find the lowest projected CASH balance (not including credit) in the next 180 days
      const lowestBalance = dailyBalances.length > 0 
        ? dailyBalances.reduce((min, day) => day.balance < min.balance ? day : min)
        : { date: today, balance: totalCash };

      // Check if balance ever goes negative
      const willGoNegative = lowestBalance.balance < 0;
      const daysUntilNegative = willGoNegative 
        ? Math.ceil((lowestBalance.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Safe Spending Logic:
      // If balance goes negative: show 0 with warning
      // Otherwise: = Lowest Projected Cash Balance - Reserve Amount
      const safeSpendingLimit = willGoNegative 
        ? 0 
        : Math.max(0, lowestBalance.balance - userReserve);

      console.log('Safe Spending Debug:', {
        totalCash,
        lowestBalanceAmount: lowestBalance.balance,
        lowestBalanceDate: lowestBalance.date,
        willGoNegative,
        daysUntilNegative,
        userReserve,
        safeSpendingLimit,
        dailyBalancesCount: dailyBalances.length,
        firstFewDays: dailyBalances.slice(0, 5).map(d => ({ date: d.date.toISOString().split('T')[0], balance: d.balance }))
      });

      setData({
        safe_spending_limit: safeSpendingLimit,
        reserve_amount: userReserve,
        will_go_negative: willGoNegative,
        negative_date: willGoNegative ? lowestBalance.date.toISOString().split('T')[0] : null,
        calculation: {
          available_balance: totalCash,
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

    // Subscribe to realtime changes for all tables that affect safe spending
    const channel = supabase
      .channel('safe-spending-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          console.log('Transaction changed - refetching safe spending');
          fetchSafeSpending();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'income' },
        () => {
          console.log('Income changed - refetching safe spending');
          fetchSafeSpending();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recurring_expenses' },
        () => {
          console.log('Recurring expense changed - refetching safe spending');
          fetchSafeSpending();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bank_accounts' },
        () => {
          console.log('Bank account changed - refetching safe spending');
          fetchSafeSpending();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'amazon_payouts' },
        () => {
          console.log('Amazon payout changed - refetching safe spending');
          fetchSafeSpending();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { data, isLoading, error, reserveAmount, updateReserveAmount, refetch: fetchSafeSpending };
};
