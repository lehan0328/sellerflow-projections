import { useState, useEffect, useCallback } from "react";
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
    safe_spending_available_date?: string;
    next_buying_opportunity_balance?: number;
    next_buying_opportunity_date?: string;
    next_buying_opportunity_available_date?: string;
    all_buying_opportunities?: Array<{ 
      date: string; 
      balance: number;
      available_date?: string;
    }>;
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

  const fetchSafeSpending = useCallback(async () => {
    try {
      console.log('🔄 [SAFE SPENDING] Starting fresh calculation...');
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
      futureDate.setDate(futureDate.getDate() + 180); // Next 6 months
      const futureDateStr = formatDate(futureDate);

      // Get ALL events that affect cash flow (matching calendar logic)
      const [transactionsResult, incomeResult, recurringResult, vendorsResult, amazonResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', session.user.id),
        
        supabase
          .from('income')
          .select('*')
          .eq('user_id', session.user.id),
        
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

      console.log('🔍 VENDOR DATA:', vendorsResult.data?.map(v => ({
        name: v.name,
        total_owed: v.total_owed,
        next_payment_date: v.next_payment_date,
        next_payment_amount: v.next_payment_amount,
        payment_schedule: v.payment_schedule,
        status: v.status
      })));

      console.log('💰 STARTING Safe Spending Calculation:', {
        bankBalance,
        reserve,
        startDate: todayStr,
        allTransactions: transactionsResult.data?.map(t => ({
          type: t.type,
          amount: t.amount,
          transaction_date: t.transaction_date,
          due_date: t.due_date,
          status: t.status
        }))
      });

      // Simple calculation: Track Total Projected Cash for each day, find minimum, subtract reserve
      const dailyBalances: DailyBalance[] = [];
      let runningBalance = bankBalance;

      // Process each day in the next 180 days (6 months)
      for (let i = 0; i <= 180; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + i);
        targetDate.setHours(0, 0, 0, 0);
        const targetDateStr = formatDate(targetDate);

        let dayChange = 0;

        // Log key dates
        const isKeyDate = i <= 3 || targetDateStr === '2025-10-20' || targetDateStr === '2025-10-10' || targetDateStr === '2025-10-17';
        if (isKeyDate) {
          console.log(`\n📅 Processing ${targetDateStr} (day ${i})`);
        }

        // Add all inflows for this day (skip sales_orders without status=completed as they're pending)
        transactionsResult.data?.forEach((tx) => {
          const txDate = parseLocalDate(tx.due_date || tx.transaction_date);
          if (txDate.getTime() === targetDate.getTime() && tx.status !== 'partially_paid') {
            if (tx.type === 'sales_order' || tx.type === 'customer_payment') {
              // Only count completed sales orders, not pending ones (they should be in income table)
              if (tx.status === 'completed') {
                const amt = Number(tx.amount);
                if (isKeyDate) {
                  console.log(`  ✅ Transaction (inflow): ${tx.type} +$${amt} (${tx.status})`);
                }
                dayChange += amt;
              } else if (isKeyDate) {
                console.log(`  ⏭️ SKIPPING pending transaction: ${tx.type} $${tx.amount} (${tx.status})`);
              }
            } else if (tx.type === 'purchase_order' || tx.type === 'expense' || tx.vendor_id) {
              const amt = Number(tx.amount);
              if (isKeyDate) {
                console.log(`  ❌ Transaction (outflow): ${tx.type} -$${amt}`);
              }
              dayChange -= amt;
            }
          }
        });

        incomeResult.data?.forEach((income) => {
          if (income.status !== 'received') {
            const incomeDate = parseLocalDate(income.payment_date);
            if (incomeDate.getTime() === targetDate.getTime()) {
              const amt = Number(income.amount);
              if (isKeyDate) {
                console.log(`  💰 Income: ${income.description} +$${amt} (status: ${income.status})`);
              }
              dayChange += amt;
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
              const amt = Number(recurring.amount);
              if (isKeyDate) {
                console.log(`  🔄 Recurring ${recurring.type}: ${recurring.name} ${recurring.type === 'income' ? '+' : '-'}$${amt}`);
              }
              dayChange += recurring.type === 'income' ? amt : -amt;
            }
          }
        });

        vendorsResult.data?.forEach((vendor) => {
          if (vendor.status !== 'paid' && Number(vendor.total_owed || 0) > 0) {
            // Check if there's already a transaction for this vendor on this date
            const hasTransactionOnDate = transactionsResult.data?.some((tx) => {
              const txDate = parseLocalDate(tx.due_date || tx.transaction_date);
              return tx.vendor_id === vendor.id && 
                     txDate.getTime() === targetDate.getTime() &&
                     tx.status !== 'partially_paid';
            });

            // Skip vendor payment if there's already a transaction for it
            if (hasTransactionOnDate) {
              if (isKeyDate) {
                console.log(`  ⏭️ SKIPPING vendor payment (already in transactions): ${vendor.name}`);
              }
              return;
            }

            if (vendor.payment_schedule && Array.isArray(vendor.payment_schedule)) {
              vendor.payment_schedule.forEach((payment: any) => {
                const paymentDate = parseLocalDate(payment.date);
                if (paymentDate.getTime() === targetDate.getTime()) {
                  const amt = Number(payment.amount || 0);
                  if (isKeyDate) {
                    console.log(`  📦 Vendor payment: ${vendor.name} -$${amt}`);
                  }
                  dayChange -= amt;
                }
              });
            } else if (vendor.next_payment_date) {
              const vendorDate = parseLocalDate(vendor.next_payment_date);
              if (vendorDate.getTime() === targetDate.getTime()) {
                const amt = Number(vendor.next_payment_amount || 0);
                if (isKeyDate) {
                  console.log(`  📦 Vendor payment (next): ${vendor.name} -$${amt}`);
                }
                dayChange -= amt;
              }
            }
          }
        });

        runningBalance += dayChange;
        dailyBalances.push({ date: targetDateStr, balance: runningBalance });
        
        // Log all days with changes
        if (dayChange !== 0) {
          console.log(`📊 ${targetDateStr}: change=${dayChange.toFixed(2)}, balance=${runningBalance.toFixed(2)}`);
        }
      }

      // Find the absolute minimum balance over the entire 180-day period
      const minBalance = Math.min(...dailyBalances.map(d => d.balance));
      const minDayIndex = dailyBalances.findIndex(d => d.balance === minBalance);
      const minDay = dailyBalances[minDayIndex];
      
      // Find ALL buying opportunities (all local minimums after the lowest balance date)
      const allBuyingOpportunities: Array<{ date: string; balance: number; available_date?: string }> = [];
      
      // Scan through all days after the global minimum to find local minimums
      let i = minDayIndex + 1;
      while (i < dailyBalances.length) {
        const current = dailyBalances[i];
        
        // Check if this is a local minimum:
        // 1. Balance is different from previous day (start of new level)
        // 2. Balance is lower than or equal to next days (forms a trough)
        // 3. Eventually rises again OR plateaus at end
        if (i > minDayIndex && current.balance !== minBalance) {
          // Find the end of this level (where balance stays same or is lowest point)
          let levelEnd = i;
          while (levelEnd < dailyBalances.length - 1 && dailyBalances[levelEnd + 1].balance === current.balance) {
            levelEnd++;
          }
          
          // Check if balance rises after this level OR we're at the end with no more changes
          const willRise = levelEnd < dailyBalances.length - 1 && dailyBalances[levelEnd + 1].balance > current.balance;
          const isPlateauEnd = levelEnd >= dailyBalances.length - 5; // Last few days with no change
          
          if (willRise || isPlateauEnd) {
            // Check if balance remains flat until the end (plateau scenario)
            let isTerminalPlateauBool = false;
            if (isPlateauEnd) {
              isTerminalPlateauBool = true;
              for (let j = levelEnd + 1; j < dailyBalances.length; j++) {
                if (dailyBalances[j].balance !== current.balance) {
                  isTerminalPlateauBool = false;
                  break;
                }
              }
            }
            
            // Find earliest available date - count forward from opportunity to find when balance rises above opportunity amount
            let availableDate: string | undefined;
            const opportunityIndex = dailyBalances.findIndex(d => d.date === current.date);
            const opportunityAmount = current.balance; // This is already balance - reserve
            
            // Find first date AFTER the low point where balance > opportunity available amount
            for (let k = opportunityIndex; k < dailyBalances.length; k++) {
              // Compare raw balance to opportunity + reserve (the minimum needed)
              if (dailyBalances[k].balance - reserve > opportunityAmount) {
                availableDate = dailyBalances[k].date;
                break;
              }
            }
            
            // Only add if this is truly a buying opportunity (will rise or is terminal)
            if (willRise || isTerminalPlateauBool) {
              allBuyingOpportunities.push({ 
                date: current.date, 
                balance: Math.max(0, current.balance - reserve),
                available_date: availableDate
              });
            }
            
            // Move past this level
            i = levelEnd + 1;
            
            // If this was a terminal plateau, stop looking
            if (isTerminalPlateauBool) {
              break;
            }
          } else {
            i++;
          }
        } else {
          i++;
        }
      }
      
      const nextBuyingOpportunity = allBuyingOpportunities.length > 0 ? allBuyingOpportunities[0] : null;
      
      // Find earliest date when you can make purchases for safe spending
      // This is the first date from today UP TO the lowest point where you have enough buffer
      let safeSpendingAvailableDate: string | undefined;
      const calculatedSafeSpending = Math.max(0, minBalance - reserve);
      
      // Find the earliest date before the lowest point where spending won't drop us below minimum
      // We need: current balance - safe spending >= minimum balance that will occur
      for (let i = 0; i <= minDayIndex; i++) {
        // Check if we can afford to spend the safe spending amount and still reach the minimum balance
        if (dailyBalances[i].balance - calculatedSafeSpending >= minBalance) {
          safeSpendingAvailableDate = dailyBalances[i].date;
          break;
        }
      }
      
      console.log('🎯 ALL BALANCES:', dailyBalances.slice(0, 20).map(d => `${d.date}: $${d.balance.toFixed(2)}`).join('\n'));
      
      if (allBuyingOpportunities.length > 0) {
        console.log('🛒 ALL BUYING OPPORTUNITIES:', allBuyingOpportunities.map(o => 
          `${o.date}: $${o.balance.toFixed(2)} (available: ${o.available_date || 'N/A'})`
        ).join(', '));
      }
      
      // Safe Spending = Min Balance - Reserve
      const safeSpendingLimit = Math.max(0, minBalance - reserve);

      console.log('🎯🎯🎯 SAFE SPENDING CALCULATION 🎯🎯🎯');
      console.log('Minimum Balance Found:', minBalance);
      console.log('On Date:', minDay.date);
      console.log('Reserve Amount:', reserve);
      console.log('Safe Spending Limit:', safeSpendingLimit);
      console.log('Formula: $' + minBalance + ' - $' + reserve + ' = $' + safeSpendingLimit);
      
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
            : (willDropBelowLimit ? firstBelowLimitDay!.date : minDay.date),
          safe_spending_available_date: safeSpendingAvailableDate,
          next_buying_opportunity_balance: nextBuyingOpportunity?.balance,
          next_buying_opportunity_date: nextBuyingOpportunity?.date,
          next_buying_opportunity_available_date: nextBuyingOpportunity?.available_date,
          all_buying_opportunities: allBuyingOpportunities
        }
      });
    } catch (err) {
      console.error("❌ Safe Spending Error:", err);
      setError(err instanceof Error ? err.message : "Failed to calculate safe spending");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  }, [fetchSafeSpending]);

  return { data, isLoading, error, reserveAmount, updateReserveAmount, refetch: fetchSafeSpending };
};
