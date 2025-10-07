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

interface CashFlowEvent {
  date: string;
  amount: number;
  type: 'inflow' | 'outflow';
  source: string;
}

export const useSafeSpending = () => {
  const [data, setData] = useState<SafeSpendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reserveAmount, setReserveAmount] = useState(0);

  // Format date consistently
  const formatDate = (date: Date | string): string => {
    if (typeof date === 'string') return date.split('T')[0];
    return date.toISOString().split('T')[0];
  };

  // Get today at midnight
  const getToday = (): string => formatDate(new Date());

  // Get starting cash balance
  const getStartingBalance = async (userId: string): Promise<{ balance: number; reserve: number }> => {
    const [settingsResult, accountsResult] = await Promise.all([
      supabase.from('user_settings').select('total_cash, safe_spending_reserve').eq('user_id', userId).single(),
      supabase.from('bank_accounts').select('balance').eq('user_id', userId).eq('is_active', true)
    ]);

    const settingsCash = Number(settingsResult.data?.total_cash || 0);
    const banksCash = accountsResult.data?.reduce((sum, acc) => sum + Number(acc.balance || 0), 0) || 0;
    const reserve = Number(settingsResult.data?.safe_spending_reserve || 0);

    // Use bank balance if available, otherwise user settings
    const balance = accountsResult.data && accountsResult.data.length > 0 ? banksCash : settingsCash;

    return { balance, reserve };
  };

  // Collect all cash flow events for the projection period
  const collectCashFlowEvents = async (userId: string, startDate: string, endDate: string): Promise<CashFlowEvent[]> => {
    const events: CashFlowEvent[] = [];

    // 1. Fetch transactions (purchase orders and sales orders)
    const { data: transactions } = await supabase
      .from('transactions')
      .select('transaction_date, amount, type')
      .eq('user_id', userId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    transactions?.forEach(tx => {
      if (tx.type === 'purchase_order' || tx.type === 'expense') {
        events.push({
          date: formatDate(tx.transaction_date),
          amount: Math.abs(Number(tx.amount)),
          type: 'outflow',
          source: `transaction-${tx.type}`
        });
      } else if (tx.type === 'sales_order' || tx.type === 'customer_payment') {
        events.push({
          date: formatDate(tx.transaction_date),
          amount: Math.abs(Number(tx.amount)),
          type: 'inflow',
          source: `transaction-${tx.type}`
        });
      }
    });

    // 2. Fetch income
    const { data: income } = await supabase
      .from('income')
      .select('payment_date, amount')
      .eq('user_id', userId)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);

    income?.forEach(inc => {
      events.push({
        date: formatDate(inc.payment_date),
        amount: Number(inc.amount),
        type: 'inflow',
        source: 'income'
      });
    });

    // 3. Fetch Amazon payouts
    const { data: payouts } = await supabase
      .from('amazon_payouts')
      .select('payout_date, total_amount')
      .eq('user_id', userId)
      .gte('payout_date', startDate)
      .lte('payout_date', endDate);

    payouts?.forEach(payout => {
      events.push({
        date: formatDate(payout.payout_date),
        amount: Number(payout.total_amount),
        type: 'inflow',
        source: 'amazon-payout'
      });
    });

    // 4. Fetch recurring expenses/income
    const { data: recurring } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    recurring?.forEach(exp => {
      const dates = generateRecurringDates(
        {
          ...exp,
          frequency: exp.frequency as any,
          type: exp.type as 'expense' | 'income'
        },
        startDateObj,
        endDateObj
      );

      dates.forEach(date => {
        events.push({
          date: formatDate(date),
          amount: Math.abs(Number(exp.amount)),
          type: exp.type === 'expense' ? 'outflow' : 'inflow',
          source: `recurring-${exp.type}`
        });
      });
    });

    // 5. Fetch vendor payments
    const { data: vendors } = await supabase
      .from('vendors')
      .select('next_payment_date, next_payment_amount, payment_schedule')
      .eq('user_id', userId);

    vendors?.forEach(vendor => {
      // Add next payment date
      if (vendor.next_payment_date && vendor.next_payment_amount) {
        const paymentDate = formatDate(vendor.next_payment_date);
        if (paymentDate >= startDate && paymentDate <= endDate) {
          events.push({
            date: paymentDate,
            amount: Math.abs(Number(vendor.next_payment_amount)),
            type: 'outflow',
            source: 'vendor-payment'
          });
        }
      }

      // Add payment schedule
      if (vendor.payment_schedule && Array.isArray(vendor.payment_schedule)) {
        vendor.payment_schedule.forEach((payment: any) => {
          if (payment.date && payment.amount) {
            const paymentDate = formatDate(payment.date);
            if (paymentDate >= startDate && paymentDate <= endDate) {
              events.push({
                date: paymentDate,
                amount: Math.abs(Number(payment.amount)),
                type: 'outflow',
                source: 'vendor-schedule'
              });
            }
          }
        });
      }
    });

    console.log('📊 Cash Flow Events Collected:', {
      totalEvents: events.length,
      byType: {
        inflow: events.filter(e => e.type === 'inflow').length,
        outflow: events.filter(e => e.type === 'outflow').length
      },
      bySource: events.reduce((acc, e) => {
        acc[e.source] = (acc[e.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      sampleEvents: events.slice(0, 5)
    });

    return events;
  };

  // Project daily balances
  const projectBalances = (startingBalance: number, events: CashFlowEvent[], days: number, today: string): DailyBalance[] => {
    const balances: DailyBalance[] = [];
    let currentBalance = startingBalance;

    // Group events by date
    const eventsByDate = events.reduce((acc, event) => {
      if (!acc[event.date]) acc[event.date] = [];
      acc[event.date].push(event);
      return acc;
    }, {} as Record<string, CashFlowEvent[]>);

    // Project each day
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = formatDate(date);

      // Calculate net change for this day
      const dayEvents = eventsByDate[dateStr] || [];
      const netChange = dayEvents.reduce((sum, event) => {
        return sum + (event.type === 'inflow' ? event.amount : -event.amount);
      }, 0);

      currentBalance += netChange;

      balances.push({
        date: dateStr,
        balance: currentBalance
      });
    }

    return balances;
  };


  // Main calculation
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
      const endDateStr = formatDate(endDate);

      // Get starting balance and reserve
      const { balance: startingBalance, reserve } = await getStartingBalance(session.user.id);
      setReserveAmount(reserve);

      // Collect all cash flow events
      const events = await collectCashFlowEvents(session.user.id, today, endDateStr);

      // Project balances
      const projectedBalances = projectBalances(startingBalance, events, 180, today);

      // Find lowest balance
      const lowestBalance = projectedBalances.reduce((min, day) => 
        day.balance < min.balance ? day : min,
        projectedBalances[0] || { date: today, balance: startingBalance }
      );

      const willGoNegative = lowestBalance.balance < 0;
      const safeSpendingLimit = willGoNegative ? 0 : Math.max(0, lowestBalance.balance - reserve);

      console.log('💰 Safe Spending Result:', {
        startingBalance,
        reserve,
        lowestBalance: lowestBalance.balance,
        lowestDate: lowestBalance.date,
        willGoNegative,
        safeSpendingLimit,
        next7Days: projectedBalances.slice(0, 7)
      });

      setData({
        safe_spending_limit: safeSpendingLimit,
        reserve_amount: reserve,
        will_go_negative: willGoNegative,
        negative_date: willGoNegative ? lowestBalance.date : null,
        calculation: {
          available_balance: startingBalance,
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
