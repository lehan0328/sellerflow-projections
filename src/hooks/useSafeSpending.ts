import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateRecurringDates } from "@/lib/recurringDates";
import { format } from "date-fns";
import { useAmazonPayouts } from "./useAmazonPayouts";
import { useUserSettings } from "./useUserSettings";
import { safeSpendingQueryKey } from "@/lib/cacheConfig";
import { useAuth } from "./useAuth";

// ... (Interfaces Transaction, SafeSpendingData, DailyBalance remain unchanged) ...
interface Transaction {
  type: string;
  description?: string;
  amount: number;
  status?: string;
  settlementId?: string;
  name?: string;
}

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
    daily_balances?: Array<{ 
      date: string; 
      balance: number;
      starting_balance?: number;
      net_change?: number;
      transactions?: Transaction[];
    }>;
  };
}

interface DailyBalance {
  date: string;
  balance: number;
  starting_balance?: number;
  net_change?: number;
  cardCredit?: Map<string, number>;
  transactions?: Array<{
    type: string;
    description?: string;
    amount: number;
    status?: string;
    settlementId?: string;
    name?: string;
  }>;
}

export const useSafeSpending = (
  reserveAmountInput: number = 0, 
  excludeTodayTransactions: boolean = false, 
  useAvailableBalance: boolean = true,
  daysToProject: number = 30,
  projectedDailyBalances?: Array<{ date: string; runningBalance: number }>
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { amazonPayouts } = useAmazonPayouts();
  const { safeSpendingReserve, forecastsEnabled, loading: settingsLoading } = useUserSettings();

  const formatDate = (date: Date | string): string => {
    if (typeof date === 'string') return date.split('T')[0];
    return date.toISOString().split('T')[0];
  };

  const parseLocalDate = (dateStr: string): Date => {
    const [y, m, d] = (dateStr.includes('T') ? dateStr.split('T')[0] : dateStr).split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  const { data, isLoading: queryLoading, error: queryError, refetch } = useQuery<SafeSpendingData>({
    queryKey: safeSpendingQueryKey(user?.id, reserveAmountInput, excludeTodayTransactions, useAvailableBalance, daysToProject),
    queryFn: async () => {
      // Don't calculate if settings are still loading
      if (settingsLoading) throw new Error("Settings loading");
    
      if (!user?.id) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) throw new Error("Account not found");

      // Use cached values instead of fetching
      const reserve = safeSpendingReserve;
      // forecastsEnabled is already available from hook

      // If forecasts are disabled, delete any existing forecasted payouts
      if (!forecastsEnabled) {
        await supabase
          .from('amazon_payouts')
          .delete()
          .eq('account_id', profile.account_id)
          .eq('status', 'forecasted');
      }

      // ... (Rest of the logic remains exactly the same, copying down to line 485) ...
      // Only the supabase fetch for 'user_settings' was removed above.
      
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('id, balance, available_balance, account_name')
        .eq('account_id', profile.account_id)
        .eq('is_active', true);

      const bankBalance = bankAccounts?.reduce((sum, acc) => {
        const balanceToUse = useAvailableBalance 
          ? (acc.available_balance ?? acc.balance)
          : acc.balance;
        
        return sum + Number(balanceToUse || 0);
      }, 0) || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = formatDate(today);

      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysToProject);
      
      const [transactionsResult, incomeResult, recurringResult, vendorsResult, creditCardsResult, creditCardPaymentsResult] = await Promise.all([
        supabase.from('transactions').select('*').eq('account_id', profile.account_id).eq('archived', false),
        supabase.from('income').select('*').eq('account_id', profile.account_id).eq('archived', false),
        supabase.from('recurring_expenses').select('*').eq('account_id', profile.account_id).eq('is_active', true),
        supabase.from('vendors').select('*').eq('account_id', profile.account_id),
        supabase.from('credit_cards').select('*').eq('account_id', profile.account_id).eq('is_active', true),
        supabase.from('credit_card_payments').select('*').eq('account_id', profile.account_id).eq('status', 'scheduled')
      ]);

      const filteredAmazonPayouts = amazonPayouts.filter(payout => {
        const payoutDate = parseLocalDate(payout.payout_date);
        if (payout.status === 'estimated') return true;
        
        if (payout.status === 'confirmed') {
          const rawData = (payout as any).raw_settlement_data;
          const settlementEndStr = rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;
          
          let fundsAvailableDate: Date;
          if (settlementEndStr) {
            const dateStr = new Date(settlementEndStr).toISOString().split('T')[0];
            const settlementEndDate = parseLocalDate(dateStr);
            fundsAvailableDate = new Date(settlementEndDate);
            fundsAvailableDate.setDate(fundsAvailableDate.getDate() + 1);
          } else {
            fundsAvailableDate = new Date(payoutDate);
            fundsAvailableDate.setDate(fundsAvailableDate.getDate() + 1);
          }
          return fundsAvailableDate >= today && fundsAvailableDate <= futureDate;
        }
        return payoutDate >= today && payoutDate <= futureDate;
      });

      const hasForecastData = (
        (transactionsResult.data && transactionsResult.data.length > 0) ||
        (incomeResult.data && incomeResult.data.length > 0) ||
        (recurringResult.data && recurringResult.data.length > 0) ||
        (vendorsResult.data && vendorsResult.data.some(v => v.status !== 'paid' && Number(v.total_owed || 0) > 0)) ||
        (filteredAmazonPayouts && filteredAmazonPayouts.length > 0) ||
        (creditCardsResult.data && creditCardsResult.data.some(c => c.balance > 0 && c.payment_due_date))
      );

      let dailyBalances: DailyBalance[] = [];
      
      if (projectedDailyBalances && projectedDailyBalances.length > 0) {
        dailyBalances = projectedDailyBalances.map(pb => ({
          date: pb.date,
          balance: pb.runningBalance,
          starting_balance: pb.runningBalance,
          net_change: 0,
          transactions: []
        }));
      } else {
        let runningBalance = bankBalance;

        for (let i = 0; i <= daysToProject; i++) {
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + i);
          targetDate.setHours(0, 0, 0, 0);
          const targetDateStr = formatDate(targetDate);

          let dayChange = 0;
          const transactionLog: any[] = [];

          transactionsResult.data?.forEach((tx) => {
            const txDate = parseLocalDate(tx.due_date || tx.transaction_date);
            if (txDate.getTime() < today.getTime()) return;
            if (excludeTodayTransactions && txDate.getTime() === today.getTime()) return;
            
            if (txDate.getTime() === targetDate.getTime() && tx.status !== 'partially_paid') {
              if (tx.type === 'sales_order' || tx.type === 'customer_payment') {
                if (tx.status === 'completed') {
                  const amt = Number(tx.amount);
                  dayChange += amt;
                  transactionLog.push({ type: 'Completed Sales Order', amount: amt, runningChange: dayChange });
                }
              } else if (tx.type === 'purchase_order' || tx.type === 'expense' || tx.vendor_id) {
                if (tx.status === 'completed') return;
                if (tx.credit_card_id) return;
                const amt = Number(tx.amount);
                dayChange -= amt;
                transactionLog.push({ type: 'Vendor Payment', amount: -amt, runningChange: dayChange });
              }
            }
          });

          incomeResult.data?.forEach((income) => {
            const incomeDate = parseLocalDate(income.payment_date);
            if (incomeDate.getTime() < today.getTime()) return;
            if (excludeTodayTransactions && incomeDate.getTime() === today.getTime()) return;
            
            if (income.status !== 'received') {
              if (incomeDate.getTime() === targetDate.getTime()) {
                if (income.category === 'Sales' || 
                    income.category === 'Sales Orders' || 
                    income.category === 'Customer Payments' ||
                    income.category === 'Service') {
                  return; 
                }
                const amt = Number(income.amount);
                dayChange += amt;
                transactionLog.push({ type: 'Income', amount: amt, runningChange: dayChange, desc: income.description });
              }
            }
          });

          filteredAmazonPayouts?.forEach((payout) => {
            const isConfirmedPayout = payout.status === 'confirmed';
            const isEstimatedPayout = payout.status === 'estimated';
            const isForecastedPayout = payout.status === 'forecasted';
            
            let fundsAvailableDate: Date;
            
            if (isConfirmedPayout) {
              const rawData = (payout as any).raw_settlement_data;
              const settlementEndStr = rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;
              if (settlementEndStr) {
                const dateStr = new Date(settlementEndStr).toISOString().split('T')[0];
                const settlementEndDate = parseLocalDate(dateStr);
                fundsAvailableDate = new Date(settlementEndDate);
                fundsAvailableDate.setDate(fundsAvailableDate.getDate() + 1);
              } else {
                fundsAvailableDate = parseLocalDate(payout.payout_date);
                fundsAvailableDate.setDate(fundsAvailableDate.getDate() + 1);
              }
            } else if (isEstimatedPayout) {
              const rawData = (payout as any).raw_settlement_data;
              const settlementEndStr = rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;
              const settlementStartStr = rawData?.settlement_start_date || rawData?.FinancialEventGroupStart;
              
              let payoutDate: Date;
              if (settlementEndStr) {
                payoutDate = parseLocalDate(settlementEndStr);
              } else if (settlementStartStr) {
                const settlementStartDate = new Date(settlementStartStr);
                const settlementCloseDate = new Date(settlementStartDate);
                settlementCloseDate.setDate(settlementCloseDate.getDate() + 15);
                payoutDate = parseLocalDate(settlementCloseDate.toISOString().split('T')[0]);
              } else {
                payoutDate = parseLocalDate(payout.payout_date);
              }
              fundsAvailableDate = new Date(payoutDate);
              fundsAvailableDate.setDate(fundsAvailableDate.getDate() + 1);
            } else {
              fundsAvailableDate = parseLocalDate(payout.payout_date);
              fundsAvailableDate.setDate(fundsAvailableDate.getDate() + 1);
            }
            
            const isOpenSettlement = payout.status === 'estimated';
            if (!isOpenSettlement && fundsAvailableDate.getTime() < today.getTime()) return;
            if (excludeTodayTransactions && fundsAvailableDate.getTime() === today.getTime() && !isOpenSettlement) return;
            
            if (fundsAvailableDate.getTime() === targetDate.getTime()) {
              const amt = Number(payout.total_amount);
              dayChange += amt;
              transactionLog.push({ 
                type: `Amazon ${payout.status}`, 
                amount: amt, 
                runningChange: dayChange,
                settlementId: payout.settlement_id
              });
            }
          });

          recurringResult.data?.forEach((recurring) => {
            if (recurring.is_active) {
              if (targetDate.getTime() < today.getTime()) return;
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
                if (excludeTodayTransactions && targetDate.getTime() === today.getTime()) return;
                const amt = Number(recurring.amount);
                dayChange += recurring.type === 'income' ? amt : -amt;
                transactionLog.push({ 
                  type: `Recurring ${recurring.type}`, 
                  amount: recurring.type === 'income' ? amt : -amt, 
                  runningChange: dayChange,
                  name: recurring.name
                });
              }
            }
          });

          vendorsResult.data?.forEach((vendor) => {
            if (vendor.status !== 'paid' && Number(vendor.total_owed || 0) > 0) {
              const hasTransactionOnDate = transactionsResult.data?.some((tx) => {
                const txDate = parseLocalDate(tx.due_date || tx.transaction_date);
                return tx.vendor_id === vendor.id && 
                       txDate.getTime() === targetDate.getTime() &&
                       tx.status !== 'partially_paid';
              });
              if (hasTransactionOnDate) return;

              if (vendor.payment_schedule && Array.isArray(vendor.payment_schedule)) {
                vendor.payment_schedule.forEach((payment: any) => {
                  const paymentDate = parseLocalDate(payment.date);
                  if (paymentDate.getTime() < today.getTime()) return;
                  if (excludeTodayTransactions && paymentDate.getTime() === today.getTime()) return;
                  if (paymentDate.getTime() === targetDate.getTime()) {
                    const amt = Number(payment.amount || 0);
                    dayChange -= amt;
                    transactionLog.push({ type: 'Scheduled Vendor Payment', amount: -amt, runningChange: dayChange, vendor: vendor.name });
                  }
                });
              } else if (vendor.next_payment_date) {
                const vendorDate = parseLocalDate(vendor.next_payment_date);
                if (vendorDate.getTime() < today.getTime()) return;
                if (excludeTodayTransactions && vendorDate.getTime() === today.getTime()) return;
                if (vendorDate.getTime() === targetDate.getTime()) {
                  const amt = Number(vendor.next_payment_amount || 0);
                  dayChange -= amt;
                  transactionLog.push({ type: 'Next Vendor Payment', amount: -amt, runningChange: dayChange, vendor: vendor.name });
                }
              }
            }
          });

          // Process credit card payments from the dedicated credit_card_payments table
          creditCardPaymentsResult.data?.forEach((payment) => {
            const paymentDate = parseLocalDate(payment.payment_date);
            if (paymentDate.getTime() < today.getTime()) return;
            if (excludeTodayTransactions && paymentDate.getTime() === today.getTime()) return;
            if (paymentDate.getTime() === targetDate.getTime()) {
              const amt = Number(payment.amount);
              dayChange -= amt;
              transactionLog.push({ 
                type: 'Credit Card Payment', 
                amount: -amt, 
                runningChange: dayChange, 
                desc: payment.description || 'Credit Card Payment'
              });
            }
          });

          const startingBalance = runningBalance;
          runningBalance += dayChange;
          
          dailyBalances.push({ 
            date: targetDateStr, 
            balance: runningBalance,
            starting_balance: startingBalance,
            net_change: dayChange,
            transactions: transactionLog.map(t => ({
              type: t.type,
              description: t.vendor || t.card || t.name || t.settlementId || '',
              amount: t.amount,
              status: t.status,
              settlementId: t.settlementId,
              name: t.name
            }))
          });
        }
      }

      // ... (Rest of calculation logic remains identical to original) ...
      const minBalance = Math.min(...dailyBalances.map(d => d.balance));
      const minDayIndex = dailyBalances.findIndex(d => d.balance === minBalance);
      const minDay = dailyBalances[minDayIndex];
      
      const negativeDays = dailyBalances.filter(d => d.balance < 0);
      const minBalanceDate = minDay.date;
      let remainingSafeSpending = Math.max(0, minBalance - reserve);
      
      const allBuyingOpportunities: Array<{ date: string; balance: number; available_date?: string }> = [];
      const todayCheck = new Date();
      todayCheck.setHours(0, 0, 0, 0);
      
      for (let i = 1; i < dailyBalances.length - 1; i++) {
        const currentDay = dailyBalances[i];
        const nextDay = dailyBalances[i + 1];
        const currentDate = new Date(currentDay.date);
        if (currentDate <= todayCheck) continue;
        
        if (nextDay.balance > currentDay.balance) {
          const minDate = new Date(minBalanceDate);
          if (currentDate < minDate) continue;
          
          const opportunityAmount = remainingSafeSpending;
          if (opportunityAmount > 0) {
            let earliestAvailableDate = currentDay.date;
            for (let j = 0; j <= i; j++) {
              let canSpendOnDayJ = true;
              for (let k = j; k < dailyBalances.length; k++) {
                const totalAvailableCredit = dailyBalances[k].cardCredit 
                  ? Array.from(dailyBalances[k].cardCredit!.values()).reduce((sum, c) => sum + Math.max(0, c), 0)
                  : 0;
                const totalSpendingPower = dailyBalances[k].balance + totalAvailableCredit;
                const balanceAfterSpending = totalSpendingPower - opportunityAmount;
                if (balanceAfterSpending < reserve) {
                  canSpendOnDayJ = false;
                  break;
                }
              }
              if (canSpendOnDayJ) {
                earliestAvailableDate = dailyBalances[j].date;
                break;
              }
            }
            allBuyingOpportunities.push({
              date: nextDay.date,
              balance: opportunityAmount,
              available_date: earliestAvailableDate
            });
            remainingSafeSpending = 0;
          }
        }
      }
      
      if (dailyBalances.length > 1) {
        const lastDay = dailyBalances[dailyBalances.length - 1];
        const secondLastDay = dailyBalances[dailyBalances.length - 2];
        const lastDayDate = new Date(lastDay.date);
        const isFuture = lastDayDate > todayCheck;
        
        if (isFuture && lastDay.balance >= secondLastDay.balance) {
          const lastDate = new Date(lastDay.date);
          const minDate = new Date(minBalanceDate);
          if (lastDate >= minDate) {
            const opportunityAmount = remainingSafeSpending;
            const alreadyCaptured = allBuyingOpportunities.some(opp => opp.date === lastDay.date);
            if (!alreadyCaptured && opportunityAmount > 0) {
              let earliestAvailableDate = lastDay.date;
              for (let j = 0; j < dailyBalances.length - 1; j++) {
                const totalAvailableCredit = dailyBalances[j].cardCredit 
                  ? Array.from(dailyBalances[j].cardCredit!.values()).reduce((sum, c) => sum + Math.max(0, c), 0)
                  : 0;
                const totalSpendingPower = dailyBalances[j].balance + totalAvailableCredit;
                if (totalSpendingPower >= (opportunityAmount + reserve)) {
                  earliestAvailableDate = dailyBalances[j].date;
                  break;
                }
              }
              allBuyingOpportunities.push({
                date: lastDay.date,
                balance: opportunityAmount,
                available_date: earliestAvailableDate
              });
              remainingSafeSpending = 0;
            }
          }
        }
      }
      
      const filteredOpportunities = allBuyingOpportunities.filter((opp, index) => {
        const hasLowerLaterOpportunity = allBuyingOpportunities
          .slice(index + 1)
          .some(laterOpp => laterOpp.balance < opp.balance);
        return !hasLowerLaterOpportunity;
      });
      
      const calculatedSafeSpending = minBalance - reserve;
      const safeSpendingLimit = calculatedSafeSpending;
      let safeSpendingAvailableDate: string | undefined;
      
      if (dailyBalances.length > 0) {
        if (dailyBalances[0].balance >= (calculatedSafeSpending + reserve)) {
          safeSpendingAvailableDate = dailyBalances[0].date;
        } else {
          for (let i = 0; i <= minDayIndex; i++) {
            if (dailyBalances[i].balance >= (calculatedSafeSpending + reserve)) {
              safeSpendingAvailableDate = dailyBalances[i].date;
              break;
            }
          }
        }
      }
      
      const safeSpendingOpportunity = {
        date: format(new Date(), 'yyyy-MM-dd'),
        balance: safeSpendingLimit,
        available_date: safeSpendingAvailableDate
      };
      
      let allOpportunitiesWithSafeSpending: Array<{ date: string; balance: number; available_date?: string }>;
      if (filteredOpportunities.length > 0 && Math.abs(filteredOpportunities[0].balance - safeSpendingLimit) < 0.01) {
        allOpportunitiesWithSafeSpending = filteredOpportunities;
      } else {
        allOpportunitiesWithSafeSpending = [safeSpendingOpportunity, ...filteredOpportunities];
      }
      
      const finalOpportunities = hasForecastData ? allOpportunitiesWithSafeSpending : [safeSpendingOpportunity];
      const nextBuyingOpportunity = finalOpportunities.length > 0 ? finalOpportunities[0] : null;
      const firstBelowLimitDay = dailyBalances.find(day => day.balance < safeSpendingLimit);
      const firstNegativeDay = dailyBalances.find(day => day.balance < 0);
      const willGoNegative = firstNegativeDay !== undefined;
      const willDropBelowLimit = firstBelowLimitDay !== undefined && !willGoNegative;

      return {
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
          all_buying_opportunities: finalOpportunities,
          daily_balances: dailyBalances
        }
      };
    },
    enabled: !!user?.id && !settingsLoading,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });


  // Real-time subscriptions for cache invalidation
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('safe-spending-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        queryClient.invalidateQueries({ 
          queryKey: safeSpendingQueryKey(user.id, reserveAmountInput, excludeTodayTransactions, useAvailableBalance, daysToProject) 
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income' }, () => {
        queryClient.invalidateQueries({ 
          queryKey: safeSpendingQueryKey(user.id, reserveAmountInput, excludeTodayTransactions, useAvailableBalance, daysToProject) 
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_expenses' }, () => {
        queryClient.invalidateQueries({ 
          queryKey: safeSpendingQueryKey(user.id, reserveAmountInput, excludeTodayTransactions, useAvailableBalance, daysToProject) 
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, () => {
        queryClient.invalidateQueries({ 
          queryKey: safeSpendingQueryKey(user.id, reserveAmountInput, excludeTodayTransactions, useAvailableBalance, daysToProject) 
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, () => {
        queryClient.invalidateQueries({ 
          queryKey: safeSpendingQueryKey(user.id, reserveAmountInput, excludeTodayTransactions, useAvailableBalance, daysToProject) 
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amazon_payouts' }, () => {
        queryClient.invalidateQueries({ 
          queryKey: safeSpendingQueryKey(user.id, reserveAmountInput, excludeTodayTransactions, useAvailableBalance, daysToProject) 
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_cards' }, () => {
        queryClient.invalidateQueries({ 
          queryKey: safeSpendingQueryKey(user.id, reserveAmountInput, excludeTodayTransactions, useAvailableBalance, daysToProject) 
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_card_payments' }, () => {
        queryClient.invalidateQueries({ 
          queryKey: safeSpendingQueryKey(user.id, reserveAmountInput, excludeTodayTransactions, useAvailableBalance, daysToProject) 
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_transactions' }, () => {
        queryClient.invalidateQueries({ 
          queryKey: safeSpendingQueryKey(user.id, reserveAmountInput, excludeTodayTransactions, useAvailableBalance, daysToProject) 
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, reserveAmountInput, excludeTodayTransactions, useAvailableBalance, daysToProject]);

  return { 
    data, 
    isLoading: queryLoading || settingsLoading, 
    error: queryError?.message || null, 
    refetch, 
    buyingOpportunities: useMemo(() => data?.calculation?.all_buying_opportunities || [], [data?.calculation?.all_buying_opportunities]) 
  };
};