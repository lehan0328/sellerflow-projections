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
      const [transactionsResult, incomeResult, recurringResult, vendorsResult, amazonResult, creditCardsResult] = await Promise.all([
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
          .gte('payout_date', todayStr)  // ONLY future payouts from today onwards
          .lte('payout_date', futureDateStr),
        
        supabase
          .from('credit_cards')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
      ]);

      console.log('📊 Fetched data:', {
        transactions: transactionsResult.data?.length || 0,
        income: incomeResult.data?.length || 0,
        recurring: recurringResult.data?.length || 0,
        vendors: vendorsResult.data?.length || 0,
        amazonPayouts: amazonResult.data?.length || 0,
        creditCards: creditCardsResult.data?.length || 0
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
          
          // Skip ALL past transactions (anything before today)
          if (txDate.getTime() < today.getTime()) {
            if (isKeyDate) {
              console.log(`  ⏭️ SKIPPING past transaction: ${tx.type} $${tx.amount} (date: ${formatDate(txDate)}, status: ${tx.status})`);
            }
            return;
          }
          
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
              // Skip credit card purchases - they're tracked separately against credit card balances
              if (tx.credit_card_id) {
                if (isKeyDate) {
                  console.log(`  💳 SKIPPING credit card purchase: ${tx.type} -$${tx.amount} (tracked in credit card)`);
                }
                return;
              }
              
              const amt = Number(tx.amount);
              if (isKeyDate) {
                console.log(`  ❌ Transaction (outflow): ${tx.type} -$${amt}`);
              }
              dayChange -= amt;
            }
          }
        });

        incomeResult.data?.forEach((income) => {
          const incomeDate = parseLocalDate(income.payment_date);
          
          // Skip ALL past income (anything before today)
          if (incomeDate.getTime() < today.getTime()) {
            if (isKeyDate) {
              console.log(`  ⏭️ SKIPPING past income: ${income.description} $${income.amount} (date: ${formatDate(incomeDate)})`);
            }
            return;
          }
          
          if (income.status !== 'received') {
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
          
          // Skip ALL past Amazon payouts (anything before today)
          if (payoutDate.getTime() < today.getTime()) {
            if (isKeyDate) {
              console.log(`  ⏭️ SKIPPING past Amazon payout: $${payout.total_amount} (date: ${formatDate(payoutDate)})`);
            }
            return;
          }
          
          if (payoutDate.getTime() === targetDate.getTime()) {
            const amt = Number(payout.total_amount);
            if (isKeyDate) {
              console.log(`  🛒 Amazon payout: +$${amt}`);
            }
            dayChange += amt;
          }
        });

        recurringResult.data?.forEach((recurring) => {
          if (recurring.is_active) {
            // Skip if target date is before today
            if (targetDate.getTime() < today.getTime()) {
              if (isKeyDate) {
                console.log(`  ⏭️ SKIPPING past recurring: ${recurring.name} (target date is in past)`);
              }
              return;
            }
            
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
                
                // Skip ALL past vendor payments
                if (paymentDate.getTime() < today.getTime()) {
                  if (isKeyDate) {
                    console.log(`  ⏭️ SKIPPING past vendor payment: ${vendor.name} $${payment.amount} (date: ${formatDate(paymentDate)})`);
                  }
                  return;
                }
                
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
              
              // Skip ALL past vendor payments
              if (vendorDate.getTime() < today.getTime()) {
                if (isKeyDate) {
                  console.log(`  ⏭️ SKIPPING past vendor payment: ${vendor.name} (date: ${formatDate(vendorDate)})`);
                }
                return;
              }
              
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

        // Add credit card payments (statement balance due on payment_due_date)
        creditCardsResult.data?.forEach((card) => {
          if (card.payment_due_date && card.balance > 0) {
            const dueDate = parseLocalDate(card.payment_due_date);
            if (dueDate.getTime() === targetDate.getTime()) {
              const amt = Number(card.balance);
              if (isKeyDate) {
                console.log(`  💳 Credit card payment: ${card.institution_name} - ${card.account_name} -$${amt}`);
              }
              dayChange -= amt;
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
      
      console.log('\n🔍 SCANNING FOR BUYING OPPORTUNITIES...');
      console.log('📊 First 30 days of balances:');
      dailyBalances.slice(0, 30).forEach((day, idx) => {
        console.log(`  ${day.date}: $${day.balance.toFixed(2)}`);
      });
      
      // Find ALL buying opportunities using a simple approach:
      // An opportunity occurs when balance INCREASES from one day to the next
      // The opportunity is the amount you can spend on the LOW day (before the increase)
      const allBuyingOpportunities: Array<{ date: string; balance: number; available_date?: string }> = [];
      
      for (let i = 0; i < dailyBalances.length - 1; i++) {
        const currentDay = dailyBalances[i];
        const nextDay = dailyBalances[i + 1];
        
        // Check if balance increases from today to tomorrow
        // This means today is a low point (valley bottom)
        if (nextDay.balance > currentDay.balance) {
          const lowPointBalance = currentDay.balance;
          const opportunityAmount = Math.max(0, lowPointBalance - reserve);
          
          // Only add if there's actually money to spend
          if (opportunityAmount > 0) {
            // Find earliest date when this purchase could be made
            // Work backwards to find when we first had enough balance
            let earliestAvailableIndex = 0;
            for (let k = i - 1; k >= 0; k--) {
              if (dailyBalances[k].balance < lowPointBalance) {
                earliestAvailableIndex = k + 1;
                break;
              }
            }
            
            const availableDate = dailyBalances[earliestAvailableIndex].date;
            
            console.log(`🛒 Opportunity #${allBuyingOpportunities.length + 1} at ${currentDay.date}:`, {
              lowPointBalance: lowPointBalance.toFixed(2),
              reserve: reserve.toFixed(2),
              opportunityAmount: opportunityAmount.toFixed(2),
              availableDate,
              nextDayBalance: nextDay.balance.toFixed(2)
            });
            
            allBuyingOpportunities.push({
              date: currentDay.date,
              balance: opportunityAmount,
              available_date: availableDate
            });
          }
        }
      }
      
      // Check the last day - if it's at a high or equal to previous day, it's an opportunity
      if (dailyBalances.length > 0) {
        const lastDay = dailyBalances[dailyBalances.length - 1];
        const secondLastDay = dailyBalances.length > 1 ? dailyBalances[dailyBalances.length - 2] : null;
        
        // If last day is at high or equal level and wasn't already captured
        if (secondLastDay && lastDay.balance >= secondLastDay.balance) {
          const opportunityAmount = Math.max(0, lastDay.balance - reserve);
          const alreadyCaptured = allBuyingOpportunities.some(opp => opp.date === lastDay.date);
          
          if (!alreadyCaptured && opportunityAmount > 0) {
            // Find earliest available date
            let earliestAvailableIndex = 0;
            for (let k = dailyBalances.length - 2; k >= 0; k--) {
              if (dailyBalances[k].balance < lastDay.balance) {
                earliestAvailableIndex = k + 1;
                break;
              }
            }
            
            const availableDate = dailyBalances[earliestAvailableIndex].date;
            
            console.log(`🛒 Terminal opportunity at ${lastDay.date}:`, {
              balance: lastDay.balance.toFixed(2),
              reserve: reserve.toFixed(2),
              opportunityAmount: opportunityAmount.toFixed(2),
              availableDate
            });
            
            allBuyingOpportunities.push({
              date: lastDay.date,
              balance: opportunityAmount,
              available_date: availableDate
            });
          }
        }
      }
      
      console.log(`\n✅ Found ${allBuyingOpportunities.length} total buying opportunities (before filtering)`);
      
      // Sort opportunities by date
      allBuyingOpportunities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Filter out opportunities that have a higher opportunity later
      // Keep only opportunities where no future opportunity has more available balance
      const filteredOpportunities: typeof allBuyingOpportunities = [];
      
      for (let i = 0; i < allBuyingOpportunities.length; i++) {
        const currentOpp = allBuyingOpportunities[i];
        
        // Check if any later opportunity has a higher balance
        const hasHigherLaterOpportunity = allBuyingOpportunities
          .slice(i + 1)
          .some(laterOpp => laterOpp.balance > currentOpp.balance);
        
        if (!hasHigherLaterOpportunity) {
          console.log(`✅ Keeping opportunity at ${currentOpp.date} with $${currentOpp.balance.toFixed(2)} (no higher opportunity later)`);
          filteredOpportunities.push(currentOpp);
        } else {
          console.log(`⏭️ Skipping opportunity at ${currentOpp.date} with $${currentOpp.balance.toFixed(2)} (higher opportunity exists later)`);
        }
      }
      
      // Replace the original array with filtered opportunities
      allBuyingOpportunities.length = 0;
      allBuyingOpportunities.push(...filteredOpportunities);
      
      console.log(`\n✅ Final ${allBuyingOpportunities.length} buying opportunities after filtering`);
      
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
          lowest_projected_balance: minBalance,
          lowest_balance_date: minDay.date,
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        console.log('🔄 Transactions changed - refetching safe spending');
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income' }, () => {
        console.log('🔄 Income changed - refetching safe spending');
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_expenses' }, () => {
        console.log('🔄 Recurring expenses changed - refetching safe spending');
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, () => {
        console.log('🔄 Bank accounts changed - refetching safe spending');
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, () => {
        console.log('🔄 Vendors changed - refetching safe spending');
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amazon_payouts' }, () => {
        console.log('🔄 Amazon payouts changed - refetching safe spending');
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deleted_transactions' }, () => {
        console.log('🔄 Transaction deleted - refetching safe spending');
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_cards' }, () => {
        console.log('🔄 Credit cards changed - refetching safe spending');
        fetchSafeSpending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSafeSpending]);

  return { data, isLoading, error, reserveAmount, updateReserveAmount, refetch: fetchSafeSpending };
};
