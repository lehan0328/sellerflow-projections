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
  date: Date;
  balance: number;
}

export const useSafeSpending = () => {
  const [data, setData] = useState<SafeSpendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reserveAmount, setReserveAmount] = useState(0);

  // Helper: Get today's date at midnight
  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  // Helper: Format date to ISO string
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // Step 1: Get current cash balance
  const getCurrentCashBalance = async (userId: string) => {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('safe_spending_reserve, total_cash')
      .eq('user_id', userId)
      .single();

    const { data: bankAccounts } = await supabase
      .from('bank_accounts')
      .select('balance, available_balance')
      .eq('user_id', userId)
      .eq('is_active', true);

    const userSettingsCash = Number(settings?.total_cash || 0);
    const bankBalance = bankAccounts?.reduce((sum, acc) => sum + Number(acc.balance || 0), 0) || 0;
    
    // Use bank balance if available, otherwise use user settings
    const totalCash = bankAccounts && bankAccounts.length > 0 ? bankBalance : userSettingsCash;
    const userReserve = settings?.safe_spending_reserve || 0;

    return { totalCash, userReserve };
  };

  // Step 2: Get all future cash flow data
  const getFutureCashFlowData = async (userId: string, startDate: Date, endDate: Date) => {
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    // Fetch all data in parallel
    const [
      { data: futureTransactions },
      { data: futureIncome },
      { data: recurringExpenses },
      { data: amazonPayouts },
      { data: vendors }
    ] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount, type, transaction_date, status')
        .eq('user_id', userId)
        .gt('transaction_date', startDateStr)
        .lte('transaction_date', endDateStr),
      
      supabase
        .from('income')
        .select('amount, payment_date, status')
        .eq('user_id', userId)
        .gt('payment_date', startDateStr)
        .lte('payment_date', endDateStr),
      
      supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true),
      
      supabase
        .from('amazon_payouts')
        .select('total_amount, payout_date')
        .eq('user_id', userId)
        .gt('payout_date', startDateStr)
        .lte('payout_date', endDateStr),
      
      supabase
        .from('vendors')
        .select('next_payment_date, next_payment_amount, payment_schedule')
        .eq('user_id', userId)
    ]);

    return {
      futureTransactions: futureTransactions || [],
      futureIncome: futureIncome || [],
      recurringExpenses: recurringExpenses || [],
      amazonPayouts: amazonPayouts || [],
      vendors: vendors || []
    };
  };

  // Step 3: Calculate daily changes for a specific date
  const calculateDailyChange = (
    dateStr: string,
    data: Awaited<ReturnType<typeof getFutureCashFlowData>>,
    today: Date,
    endDate: Date
  ) => {
    let dailyChange = 0;

    // Add income from transactions (sales orders, customer payments)
    data.futureTransactions.forEach(tx => {
      const txDate = formatDate(new Date(tx.transaction_date));
      if (txDate === dateStr) {
        const amount = Number(tx.amount);
        if (tx.type === 'sales_order' || tx.type === 'customer_payment') {
          dailyChange += Math.abs(amount);
        } else if (tx.type === 'purchase_order' || tx.type === 'expense') {
          dailyChange -= Math.abs(amount);
        }
      }
    });

    // Add income
    data.futureIncome.forEach(income => {
      const incomeDate = formatDate(new Date(income.payment_date));
      if (incomeDate === dateStr) {
        dailyChange += Number(income.amount);
      }
    });

    // Add Amazon payouts
    data.amazonPayouts.forEach(payout => {
      const payoutDate = formatDate(new Date(payout.payout_date));
      if (payoutDate === dateStr) {
        dailyChange += Number(payout.total_amount);
      }
    });

    // Subtract vendor payments
    data.vendors.forEach(vendor => {
      // Check next payment date
      if (vendor.next_payment_date) {
        const vendorDate = formatDate(new Date(vendor.next_payment_date));
        if (vendorDate === dateStr) {
          dailyChange -= Math.abs(Number(vendor.next_payment_amount || 0));
        }
      }

      // Check payment schedule
      if (vendor.payment_schedule && Array.isArray(vendor.payment_schedule)) {
        vendor.payment_schedule.forEach((payment: any) => {
          if (payment.date) {
            const scheduleDate = formatDate(new Date(payment.date));
            if (scheduleDate === dateStr) {
              dailyChange -= Math.abs(Number(payment.amount || 0));
            }
          }
        });
      }
    });

    // Handle recurring expenses
    data.recurringExpenses.forEach(expense => {
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
        const recurringDateStr = formatDate(date);
        if (recurringDateStr === dateStr) {
          if (expense.type === 'expense') {
            dailyChange -= Math.abs(Number(expense.amount));
          } else {
            dailyChange += Number(expense.amount);
          }
        }
      });
    });

    return dailyChange;
  };

  // Step 4: Project daily balances for next 180 days
  const projectDailyBalances = (
    startingCash: number,
    cashFlowData: Awaited<ReturnType<typeof getFutureCashFlowData>>,
    today: Date
  ): DailyBalance[] => {
    const dailyBalances: DailyBalance[] = [];
    let runningBalance = startingCash;
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 180);

    // Project each day
    for (let i = 1; i <= 180; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = formatDate(currentDate);

      const dailyChange = calculateDailyChange(dateStr, cashFlowData, today, endDate);
      runningBalance += dailyChange;
      
      dailyBalances.push({ 
        date: currentDate, 
        balance: runningBalance 
      });
    }

    return dailyBalances;
  };

  // Main calculation function
  const fetchSafeSpending = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        return;
      }

      const today = getToday();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 180);

      // Step 1: Get current balance
      const { totalCash, userReserve } = await getCurrentCashBalance(session.user.id);
      setReserveAmount(userReserve);

      // Step 2: Get future cash flow data
      const cashFlowData = await getFutureCashFlowData(session.user.id, today, endDate);

      console.log('Cash Flow Data:', {
        futureTransactionsCount: cashFlowData.futureTransactions.length,
        futureIncomeCount: cashFlowData.futureIncome.length,
        recurringExpensesCount: cashFlowData.recurringExpenses.length,
        amazonPayoutsCount: cashFlowData.amazonPayouts.length,
        vendorsCount: cashFlowData.vendors.length,
      });

      // Step 3: Project daily balances
      const dailyBalances = projectDailyBalances(totalCash, cashFlowData, today);

      // Step 4: Find lowest balance
      const lowestBalance = dailyBalances.length > 0 
        ? dailyBalances.reduce((min, day) => day.balance < min.balance ? day : min)
        : { date: today, balance: totalCash };

      // Step 5: Calculate safe spending
      const willGoNegative = lowestBalance.balance < 0;
      const safeSpendingLimit = willGoNegative ? 0 : Math.max(0, lowestBalance.balance - userReserve);

      console.log('Safe Spending Calculation:', {
        totalCash,
        lowestBalanceAmount: lowestBalance.balance,
        lowestBalanceDate: formatDate(lowestBalance.date),
        willGoNegative,
        userReserve,
        safeSpendingLimit,
        firstFewDays: dailyBalances.slice(0, 10).map(d => ({ 
          date: formatDate(d.date), 
          balance: d.balance 
        }))
      });

      setData({
        safe_spending_limit: safeSpendingLimit,
        reserve_amount: userReserve,
        will_go_negative: willGoNegative,
        negative_date: willGoNegative ? formatDate(lowestBalance.date) : null,
        calculation: {
          available_balance: totalCash,
          lowest_projected_balance: lowestBalance.balance,
          lowest_balance_date: formatDate(lowestBalance.date),
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

    // Subscribe to realtime changes
    const channel = supabase
      .channel('safe-spending-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchSafeSpending)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income' }, fetchSafeSpending)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_expenses' }, fetchSafeSpending)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, fetchSafeSpending)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amazon_payouts' }, fetchSafeSpending)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, fetchSafeSpending)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { data, isLoading, error, reserveAmount, updateReserveAmount, refetch: fetchSafeSpending };
};
