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
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      const { data: creditCards } = await supabase
        .from('credit_cards')
        .select('available_credit')
        .eq('user_id', session.user.id);

      // Calculate starting balance same way as Dashboard
      // Get all completed transactions up to TODAY (ignore overdue)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      // ONLY get completed transactions (ignore pending/overdue)
      const { data: completedTransactions } = await supabase
        .from('transactions')
        .select('amount, type, transaction_date, status')
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .lte('transaction_date', todayStr);

      const transactionTotal = completedTransactions?.reduce((total, tx) => {
        const amount = Number(tx.amount);
        const isIncome = tx.type === 'customer_payment' || tx.type === 'sales_order';
        return isIncome ? total + amount : total - amount;
      }, 0) || 0;

      // Get ONLY completed income up to today (ignore overdue pending income)
      const { data: completedIncome } = await supabase
        .from('income')
        .select('amount, payment_date, status')
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .lte('payment_date', todayStr);

      const incomeTotal = completedIncome?.reduce((total, income) => {
        return total + Number(income.amount);
      }, 0) || 0;

      const userSettingsCash = Number(settings?.total_cash || 0);
      const bankBalance = bankAccounts?.reduce((sum, acc) => sum + Number(acc.balance || 0), 0) || 0;
      
      // Use bank balance if available, otherwise calculate from user settings + completed transactions + completed income
      const totalCash = bankAccounts && bankAccounts.length > 0 
        ? bankBalance 
        : userSettingsCash + transactionTotal + incomeTotal;
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

      // Find the lowest projected CASH balance (not including credit) in the next 180 days
      const lowestBalance = dailyBalances.length > 0 
        ? dailyBalances.reduce((min, day) => day.balance < min.balance ? day : min)
        : { date: today, balance: totalCash };

      // Safe Spending Logic:
      // = Lowest Projected Cash Balance - Reserve Amount
      // Example: If lowest cash is $78,500 and reserve is $2,000, safe spending is $76,500
      const safeSpendingLimit = Math.max(0, lowestBalance.balance - userReserve);

      console.log('Safe Spending Debug:', {
        totalCash,
        lowestBalanceAmount: lowestBalance.balance,
        lowestBalanceDate: lowestBalance.date,
        userReserve,
        safeSpendingLimit,
        dailyBalancesCount: dailyBalances.length,
        firstFewDays: dailyBalances.slice(0, 5).map(d => ({ date: d.date.toISOString().split('T')[0], balance: d.balance }))
      });

      setData({
        safe_spending_limit: safeSpendingLimit,
        reserve_amount: userReserve,
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
  }, []);

  return { data, isLoading, error, reserveAmount, updateReserveAmount, refetch: fetchSafeSpending };
};
