import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { calculateCalendarBalances } from '@/lib/calendarBalances';
import { useCalendarEvents } from './useCalendarEvents';

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
      date: string; // When funds are available (peak date)
      lowPointDate: string; // Actual lowest projected balance date  
      balance: number; // Amount safe to spend
      available_date?: string; // Earliest date to safely spend this amount
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
  daysToProject: number = 30 // Reduced from 90 to 30 days for faster calculation
) => {
  const { amazonPayouts, forecastsEnabled } = useAmazonPayouts();
  const [data, setData] = useState<SafeSpendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        return;
      }

      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!profile?.account_id) {
        setError("Account not found");
        return;
      }

      // ALWAYS fetch the latest reserve AND forecast settings from database to ensure accuracy
      const { data: settings } = await supabase
        .from('user_settings')
        .select('safe_spending_reserve, forecasts_enabled')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const reserve = Number(settings?.safe_spending_reserve || 0);
      const forecastsEnabled = settings?.forecasts_enabled ?? true;

      // If forecasts are disabled, delete any existing forecasted payouts
      if (!forecastsEnabled) {
        await supabase
          .from('amazon_payouts')
          .delete()
          .eq('account_id', profile.account_id)
          .eq('status', 'forecasted');
      }

      // Get bank account balance - use available_balance or balance based on toggle
      // IMPORTANT: Filter by account_id to ensure account separation
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('id, balance, available_balance, account_name')
        .eq('account_id', profile.account_id)
        .eq('is_active', true);

      const bankBalance = bankAccounts?.reduce((sum, acc) => {
        // When using available_balance mode, trust the bank's available_balance
        // as it already accounts for pending transactions (from Plaid)
        // When using current balance mode, just use the balance as-is
        const balanceToUse = useAvailableBalance 
          ? (acc.available_balance ?? acc.balance)
          : acc.balance;
        
        console.log('🏦 [useSafeSpending] Bank account:', {
          name: acc.account_name,
          balance: acc.balance,
          available_balance: acc.available_balance,
          using: balanceToUse,
          mode: useAvailableBalance ? 'available' : 'current'
        });
        
        return sum + Number(balanceToUse || 0);
      }, 0) || 0;
      
      console.log('💵 [useSafeSpending] Starting calculation:', {
        totalBankBalance: bankBalance,
        useAvailableBalance,
        excludeTodayTransactions,
        reserve
      });

      // Get ALL events (transactions, income, recurring, vendors, etc.)
      // This should match what the calendar receives
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = formatDate(today);

      // Project ahead based on daysToProject parameter (default 30 days)
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysToProject);
      const futureDateStr = formatDate(futureDate);
      
      // Get ALL events that affect cash flow (matching calendar logic)
      const [transactionsResult, incomeResult, recurringResult, vendorsResult, creditCardsResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('account_id', profile.account_id)
          .eq('archived', false),
        
        supabase
          .from('income')
          .select('*')
          .eq('account_id', profile.account_id)
          .eq('archived', false),
        
        supabase
          .from('recurring_expenses')
          .select('*')
          .eq('account_id', profile.account_id)
          .eq('is_active', true),
        
        supabase
          .from('vendors')
          .select('*')
          .eq('account_id', profile.account_id),
        
        supabase
          .from('credit_cards')
          .select('*')
          .eq('account_id', profile.account_id)
          .eq('is_active', true)
      ]);

      // Use centralized calendar events - same as Dashboard chart for 100% consistency
      const { calendarEvents, startingBalance: hookStartingBalance, isLoading: eventsLoading } = useCalendarEvents();
      
      if (eventsLoading) {
        setIsLoading(true);
        return;
      }

      // Use shared calendar balance calculation (same as chart)
      const { dailyBalances: sharedDailyBalances, minimumBalance: sharedMinBalance, minimumDate: sharedMinDate } = calculateCalendarBalances(
        hookStartingBalance,
        calendarEvents,
        daysToProject
      );

      console.log('📊 [useSafeSpending] Using shared calendar balance calculation:', {
        startingBalance: hookStartingBalance,
        totalEvents: calendarEvents.length,
        dailyBalancesCount: sharedDailyBalances.length,
        minimumBalance: sharedMinBalance,
        minimumDate: sharedMinDate
      });

      // Convert to internal format for buying opportunity detection
      const dailyBalances: DailyBalance[] = sharedDailyBalances.map(day => ({
        date: day.date,
        balance: day.runningBalance,
        starting_balance: day.runningBalance - day.dailyChange,
        net_change: day.dailyChange,
        transactions: [] // Not needed for opportunity detection
      }));

      // Skip old day-by-day calculation - now using shared calculation above
      const filteredAmazonPayouts = [] as any[]; // No longer needed
        const payoutDate = parseLocalDate(payout.payout_date);
        
        // ALWAYS include open settlements (estimated status) - they represent real accumulating funds
        if (payout.status === 'estimated') {
          return true;
        }
        
        // For confirmed payouts, check if funds are available (T+1) within our projection window
        if (payout.status === 'confirmed') {
          // Calculate funds available date (T+1 from settlement end)
          const rawData = (payout as any).raw_settlement_data;
          const settlementEndStr = rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;
          
          let fundsAvailableDate: Date;
          if (settlementEndStr) {
            const dateStr = new Date(settlementEndStr).toISOString().split('T')[0];
            const settlementEndDate = parseLocalDate(dateStr);
            fundsAvailableDate = new Date(settlementEndDate);
            fundsAvailableDate.setDate(fundsAvailableDate.getDate() + 1);
          } else {
            // Fallback to payout_date + T+1
            fundsAvailableDate = new Date(payoutDate);
            fundsAvailableDate.setDate(fundsAvailableDate.getDate() + 1);
          }
          
          // Include if funds are available between today and futureDate
          return fundsAvailableDate >= today && fundsAvailableDate <= futureDate;
        }
        
        // For forecasted payouts, use standard date range check
        return payoutDate >= today && payoutDate <= futureDate;
      });
      
      console.log('🔍 [useSafeSpending] Filtered Amazon payouts:', {
        total: filteredAmazonPayouts.length,
        confirmed: filteredAmazonPayouts.filter(p => p.status === 'confirmed').length,
        estimated: filteredAmazonPayouts.filter(p => p.status === 'estimated').length,
        forecasted: filteredAmazonPayouts.filter(p => p.status === 'forecasted').length,
        confirmedPayouts: filteredAmazonPayouts
          .filter(p => p.status === 'confirmed')
          .map(p => ({
            settlement_id: p.settlement_id,
            payout_date: p.payout_date,
            amount: p.total_amount
          }))
      });

      // Check if we have any forecast data (using calendar events)
      const hasForecastData = calendarEvents.length > 0;
      // OLD DAY-BY-DAY CALCULATION REMOVED
      // Now using shared calculateCalendarBalances from lib/calendarBalances.ts
      // This ensures 100% consistency with the Dashboard chart
          // Skip today's transactions if excludeTodayTransactions is true
          if (excludeTodayTransactions && txDate.getTime() === today.getTime()) {
            return;
          }
          
          if (txDate.getTime() === targetDate.getTime() && tx.status !== 'partially_paid') {
            if (tx.type === 'sales_order' || tx.type === 'customer_payment') {
              // Only count completed sales orders, not pending ones (they should be in income table)
              if (tx.status === 'completed') {
                const amt = Number(tx.amount);
                dayChange += amt;
                if (isTargetDateRange) {
                  transactionLog.push({ type: 'Completed Sales Order', amount: amt, runningChange: dayChange });
                }
              }
            } else if (tx.type === 'purchase_order' || tx.type === 'expense' || tx.vendor_id) {
              // Skip completed transactions - they're already reflected in bank balance
              if (tx.status === 'completed') {
                return;
              }
              
              // Skip credit card purchases - they're tracked separately against credit card balances
              if (tx.credit_card_id) {
                return;
              }
              
              const amt = Number(tx.amount);
              dayChange -= amt;
              if (isTargetDateRange) {
                transactionLog.push({ type: 'Vendor Payment', amount: -amt, runningChange: dayChange });
              }
            }
          }
        });

        incomeResult.data?.forEach((income) => {
          const incomeDate = parseLocalDate(income.payment_date);
          
          // Skip ALL past income (anything before today)
          if (incomeDate.getTime() < today.getTime()) {
            return;
          }
          
          // Skip today's income if excludeTodayTransactions is true
          if (excludeTodayTransactions && incomeDate.getTime() === today.getTime()) {
            return;
          }
          
          if (income.status !== 'received') {
            if (incomeDate.getTime() === targetDate.getTime()) {
              // Skip sales categories that are counted from transactions to avoid duplication
              if (income.category === 'Sales' || 
                  income.category === 'Sales Orders' || 
                  income.category === 'Customer Payments' ||
                  income.category === 'Service') {
                return; // These are counted from dbTransactions
              }
              
              const amt = Number(income.amount);
              dayChange += amt;
              if (isTargetDateRange) {
                transactionLog.push({ type: 'Income', amount: amt, runningChange: dayChange, desc: income.description });
              }
            }
          }
        });

        // Include ALL Amazon payouts (confirmed, estimated, and forecasted if enabled)
        filteredAmazonPayouts?.forEach((payout) => {
          const isConfirmedPayout = payout.status === 'confirmed';
          const isEstimatedPayout = payout.status === 'estimated';
          const isForecastedPayout = payout.status === 'forecasted';
          
          let fundsAvailableDate: Date;
          
          if (isConfirmedPayout) {
            // For confirmed payouts, use FinancialEventGroupEnd + T+1 (next day availability)
            const rawData = (payout as any).raw_settlement_data;
            const settlementEndStr = rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;
            
            if (settlementEndStr) {
              // Extract date portion and parse as local date
              const dateStr = new Date(settlementEndStr).toISOString().split('T')[0];
              const settlementEndDate = parseLocalDate(dateStr);
              
              // Add T+1 for next-day availability (consistent with other payout types)
              fundsAvailableDate = new Date(settlementEndDate);
              fundsAvailableDate.setDate(fundsAvailableDate.getDate() + 1);
            } else {
              // Fallback to payout_date + T+1 if no settlement data available
              fundsAvailableDate = parseLocalDate(payout.payout_date);
              fundsAvailableDate.setDate(fundsAvailableDate.getDate() + 1);
            }
          } else if (isEstimatedPayout) {
            // For estimated payouts, calculate from settlement end date + 1 day
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
            // For forecasted payouts, add T+1 (next-day availability)
            // This matches Amazon's typical payout timing where funds become available the next day
            fundsAvailableDate = parseLocalDate(payout.payout_date);
            fundsAvailableDate.setDate(fundsAvailableDate.getDate() + 1);
          }
          
          // ALWAYS include open settlements (estimated) - they represent real accumulating money
          // Only skip past payouts if they're NOT open settlements
          const isOpenSettlement = payout.status === 'estimated';
          if (!isOpenSettlement && fundsAvailableDate.getTime() < today.getTime()) {
            return;
          }
          
          // Don't apply excludeToday filter to open settlements - they're always included
          if (excludeTodayTransactions && fundsAvailableDate.getTime() === today.getTime() && !isOpenSettlement) {
            return;
          }
          
          if (fundsAvailableDate.getTime() === targetDate.getTime()) {
            const amt = Number(payout.total_amount);
            dayChange += amt;
            if (isTargetDateRange) {
              transactionLog.push({ 
                type: `Amazon ${payout.status}`, 
                amount: amt, 
                runningChange: dayChange,
                settlementId: payout.settlement_id
              });
            }
          }
        });

        recurringResult.data?.forEach((recurring) => {
          if (recurring.is_active) {
            // Skip if target date is before today
            if (targetDate.getTime() < today.getTime()) {
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
              // Skip today's recurring transactions if excludeTodayTransactions is true
              if (excludeTodayTransactions && targetDate.getTime() === today.getTime()) {
                return;
              }
              
              const amt = Number(recurring.amount);
              dayChange += recurring.type === 'income' ? amt : -amt;
              if (isTargetDateRange) {
                transactionLog.push({ 
                  type: `Recurring ${recurring.type}`, 
                  amount: recurring.type === 'income' ? amt : -amt, 
                  runningChange: dayChange,
                  name: recurring.name
                });
              }
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
              return;
            }

            if (vendor.payment_schedule && Array.isArray(vendor.payment_schedule)) {
              vendor.payment_schedule.forEach((payment: any) => {
                const paymentDate = parseLocalDate(payment.date);
                
                // Skip ALL past vendor payments
                if (paymentDate.getTime() < today.getTime()) {
                  return;
                }
                
                // Skip today's vendor payments if excludeTodayTransactions is true
                if (excludeTodayTransactions && paymentDate.getTime() === today.getTime()) {
                  return;
                }
                
                if (paymentDate.getTime() === targetDate.getTime()) {
                  const amt = Number(payment.amount || 0);
                  dayChange -= amt;
                  if (isTargetDateRange) {
                    transactionLog.push({ 
                      type: 'Scheduled Vendor Payment', 
                      amount: -amt, 
                      runningChange: dayChange,
                      vendor: vendor.name
                    });
                  }
                }
              });
            } else if (vendor.next_payment_date) {
              const vendorDate = parseLocalDate(vendor.next_payment_date);
              
              // Skip ALL past vendor payments
              if (vendorDate.getTime() < today.getTime()) {
                return;
              }
              
              // Skip today's vendor payments if excludeTodayTransactions is true
              if (excludeTodayTransactions && vendorDate.getTime() === today.getTime()) {
                return;
              }
              
              if (vendorDate.getTime() === targetDate.getTime()) {
                const amt = Number(vendor.next_payment_amount || 0);
                dayChange -= amt;
                if (isTargetDateRange) {
                  transactionLog.push({ 
                    type: 'Next Vendor Payment', 
                    amount: -amt, 
                    runningChange: dayChange,
                    vendor: vendor.name
                  });
                }
              }
            }
          }
        });

        // Add credit card payments (statement balance due on payment_due_date)
        creditCardsResult.data?.forEach((card) => {
          if (card.payment_due_date && card.balance > 0) {
            const dueDate = parseLocalDate(card.payment_due_date);
            
            // Skip ALL past credit card payments
            if (dueDate.getTime() < today.getTime()) {
              return;
            }
            
            // Skip today's credit card payments if excludeTodayTransactions is true
            if (excludeTodayTransactions && dueDate.getTime() === today.getTime()) {
              return;
            }
            
            if (dueDate.getTime() === targetDate.getTime()) {
              const amt = Number(card.balance);
              dayChange -= amt;
              if (isTargetDateRange) {
                transactionLog.push({ 
                  type: 'Credit Card Payment', 
                  amount: -amt, 
                  runningChange: dayChange,
                  card: card.account_name
                });
              }
            }
          }
        });

        const startingBalance = runningBalance;
        runningBalance += dayChange;
        
        // Store transaction details for each day
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
        
        // Log transactions for target date range
        if (isTargetDateRange && (dayChange !== 0 || targetDateStr === '2024-10-31' || targetDateStr === '2025-12-12')) {
          console.log(`💰 [useSafeSpending] ${targetDateStr}:`, {
            transactions: transactionLog,
            dayChange: dayChange.toFixed(2),
            runningBalance: runningBalance.toFixed(2),
            previousBalance: (runningBalance - dayChange).toFixed(2)
          });
        }
      }

      // Find the absolute minimum balance over the entire 90-day period (3 months) ONLY
      // This ensures we ONLY look at the next 3 months, not beyond
      const minBalance = Math.min(...dailyBalances.map(d => d.balance));
      const minDayIndex = dailyBalances.findIndex(d => d.balance === minBalance);
      const minDay = dailyBalances[minDayIndex];
      
      // Find any negative days
      const negativeDays = dailyBalances.filter(d => d.balance < 0);
      
      console.log('💰 Safe Spending Calculation:', {
        currentBankBalance: bankBalance,
        totalDaysCalculated: dailyBalances.length,
        lowestProjectedBalance: minBalance,
        lowestBalanceDate: minDay.date,
        reserveAmount: reserve,
        negativeDaysCount: negativeDays.length,
        negativeDays: negativeDays.map(d => ({ date: d.date, balance: d.balance })),
        safeSpendingCalc: `${minBalance} - ${reserve} = ${minBalance - reserve}`,
        first10Days: dailyBalances.slice(0, 10).map(d => ({ date: d.date, balance: d.balance })),
        last10Days: dailyBalances.slice(-10).map(d => ({ date: d.date, balance: d.balance }))
      });
      
      // Find ALL buying opportunities using a simple approach:
      // An opportunity occurs when balance INCREASES from one day to the next
      // The opportunity is the amount you can spend on the LOW day (before the increase)
      // ONLY look at FUTURE dates (exclude today and overdue)
      const allBuyingOpportunities: Array<{ date: string; balance: number; available_date?: string }> = [];
      
      const todayCheck = new Date();
      todayCheck.setHours(0, 0, 0, 0);
      
      for (let i = 1; i < dailyBalances.length - 1; i++) {  // Start from i=1 to skip today
        const currentDay = dailyBalances[i];
        const nextDay = dailyBalances[i + 1];
        
        // Double check: Skip today and past dates - only look at FUTURE
        const currentDate = new Date(currentDay.date);
        if (currentDate <= todayCheck) {
          continue;
        }
        
        // Check if balance increases from current to next day
        // This means current day is a low point (valley bottom)
        if (nextDay.balance > currentDay.balance) {
          const lowPointBalance = currentDay.balance;
          const opportunityAmount = Math.max(0, lowPointBalance - reserve);
          
          // Only add if there's actually money to spend
          if (opportunityAmount > 0) {
            // Work backward to find the EARLIEST date when you can spend this amount
            // Check that spending it won't cause balance to drop below reserve on ANY day between that date and the low point
            let earliestAvailableDate = currentDay.date; // Default to low point date
            
            for (let j = 0; j <= i; j++) {
              // Check if spending the opportunity amount on day j would cause any day
              // between j and i to drop below reserve
              let canSpendOnDayJ = true;
              
              for (let k = j; k <= i; k++) {
                // If we spend opportunityAmount on day j, what would the balance be on day k?
                // We need to subtract it from all days >= j
                const balanceAfterSpending = dailyBalances[k].balance - opportunityAmount;
                
                // Must stay above reserve, not just above 0
                if (balanceAfterSpending < reserve) {
                  canSpendOnDayJ = false;
                  break;
                }
              }
              
              if (canSpendOnDayJ) {
                earliestAvailableDate = dailyBalances[j].date;
                break; // Found the earliest safe date
              }
            }
            
            allBuyingOpportunities.push({
              date: nextDay.date, // Use nextDay when money actually arrives, not the valley bottom
              balance: opportunityAmount, // This is what can safely be spent (low point balance - reserve)
              available_date: earliestAvailableDate
            });
          }
        }
      }
      
      // Check the last day - if it's at a high or equal to previous day, it's an opportunity
      // BUT only if it's a FUTURE date (not today)
      if (dailyBalances.length > 1) {
        const lastDay = dailyBalances[dailyBalances.length - 1];
        const secondLastDay = dailyBalances[dailyBalances.length - 2];
        
        // Check if last day is in the future
        const lastDayDate = new Date(lastDay.date);
        const isFuture = lastDayDate > todayCheck;
        
        // If last day is at high or equal level and wasn't already captured
        if (isFuture && lastDay.balance >= secondLastDay.balance) {
          const opportunityAmount = Math.max(0, lastDay.balance - reserve);
          const alreadyCaptured = allBuyingOpportunities.some(opp => opp.date === lastDay.date);
          
          if (!alreadyCaptured && opportunityAmount > 0) {
            // Work backward to find the EARLIEST date when balance first reached this level
            // while maintaining reserve buffer
            let earliestAvailableDate = lastDay.date; // Default to last day
            const terminalBalance = lastDay.balance;
            
            for (let j = 0; j < dailyBalances.length - 1; j++) {
              // Check if balance at day j is high enough to spend this amount while keeping reserve
              if (dailyBalances[j].balance >= (opportunityAmount + reserve)) {
                earliestAvailableDate = dailyBalances[j].date;
                break; // Found the earliest date
              }
            }
            
            allBuyingOpportunities.push({
              date: lastDay.date,
              balance: opportunityAmount,
              available_date: earliestAvailableDate
            });
          }
        }
      }
      
      // Filter out opportunities where a later opportunity has lower projected cash
      // If opportunity 3 has less $ than opportunity 2, remove opportunity 2
      const filteredOpportunities = allBuyingOpportunities.filter((opp, index) => {
        // Check if any later opportunity has a lower balance
        const hasLowerLaterOpportunity = allBuyingOpportunities
          .slice(index + 1)
          .some(laterOpp => laterOpp.balance < opp.balance);
        
        if (hasLowerLaterOpportunity) {
          return false;
        }
        return true;
      });
      
      // Safe Spending = minimum projected balance - reserve (accounts for future obligations)
      // This is what you can safely spend without going below minimum projected balance
      const calculatedSafeSpending = minBalance - reserve;
      
      // If minimum balance is negative, safe spending MUST be 0 or negative
      // Don't artificially inflate it
      const safeSpendingLimit = calculatedSafeSpending;
      
      console.log('💰 Final Safe Spending:', {
        minBalance,
        reserve,
        calculated: calculatedSafeSpending,
        finalValue: safeSpendingLimit,
        isNegative: safeSpendingLimit < 0
      });
      
      // Find earliest date when you can make purchases for safe spending
      // If we have enough cash TODAY, set available date to today
      // Otherwise, find the first date where balance supports the spending
      let safeSpendingAvailableDate: string | undefined;
      
      if (dailyBalances.length > 0) {
        // Check if we can afford to spend today
        if (dailyBalances[0].balance >= (calculatedSafeSpending + reserve)) {
          // We have enough cash today
          safeSpendingAvailableDate = dailyBalances[0].date;
        } else {
          // Find the first date when we'll have enough
          for (let i = 0; i <= minDayIndex; i++) {
            if (dailyBalances[i].balance >= (calculatedSafeSpending + reserve)) {
              safeSpendingAvailableDate = dailyBalances[i].date;
              break;
            }
          }
        }
      }
      
      // Create Opportunity 1 to match the safe spending limit
      const safeSpendingOpportunity = {
        date: format(new Date(), 'yyyy-MM-dd'),
        balance: safeSpendingLimit,
        available_date: safeSpendingAvailableDate
      };
      
      // Only prepend safe spending opportunity if it's different from the first filtered opportunity
      // to avoid showing duplicate opportunities
      let allOpportunitiesWithSafeSpending: Array<{ date: string; balance: number; available_date?: string }>;
      
      if (filteredOpportunities.length > 0 && 
          Math.abs(filteredOpportunities[0].balance - safeSpendingLimit) < 0.01) {
        // First opportunity is essentially the same as safe spending - don't duplicate it
        allOpportunitiesWithSafeSpending = filteredOpportunities;
      } else {
        // Safe spending is unique - prepend it
        allOpportunitiesWithSafeSpending = [safeSpendingOpportunity, ...filteredOpportunities];
      }
      
      // If we have no forecast data, only show safe spending opportunity
      const finalOpportunities = hasForecastData ? allOpportunitiesWithSafeSpending : [safeSpendingOpportunity];
      
      const nextBuyingOpportunity = finalOpportunities.length > 0 ? finalOpportunities[0] : null;
      
      // Find the FIRST day balance goes below safe spending limit (SSL)
      const firstBelowLimitDay = dailyBalances.find(day => day.balance < safeSpendingLimit);
      
      // Find the FIRST day balance goes negative (< 0)
      const firstNegativeDay = dailyBalances.find(day => day.balance < 0);
      
      // Determine the warning state
      const willGoNegative = firstNegativeDay !== undefined;
      const willDropBelowLimit = firstBelowLimitDay !== undefined && !willGoNegative;

      setData({
        safe_spending_limit: safeSpendingLimit, // Don't use Math.max - allow negative to show reserve is higher than minimum
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
      });
    } catch (err) {
      console.error("❌ Safe Spending Error:", err);
      setError(err instanceof Error ? err.message : "Failed to calculate safe spending");
    } finally {
      setIsLoading(false);
    }
  }, [reserveAmountInput, excludeTodayTransactions, useAvailableBalance, amazonPayouts, forecastsEnabled]);


  useEffect(() => {
    fetchSafeSpending();
  }, [fetchSafeSpending, reserveAmountInput, excludeTodayTransactions, useAvailableBalance]); // Recalculate when reserve, exclude setting, or balance type changes

  useEffect(() => {

    const channel = supabase
      .channel('safe-spending-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income' }, () => {
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_expenses' }, () => {
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, () => {
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, () => {
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amazon_payouts' }, () => {
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deleted_transactions' }, () => {
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_cards' }, () => {
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_transactions' }, () => {
        fetchSafeSpending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_settings' }, () => {
        fetchSafeSpending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSafeSpending, reserveAmountInput]); // Re-subscribe when reserve input changes

  return { data, isLoading, error, refetch: fetchSafeSpending };
};
