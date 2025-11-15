import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCalendarEvents } from "./useCalendarEvents";
import { calculateCalendarBalances } from "@/lib/calendarBalances";

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
      lowPointDate: string;
      balance: number;
      available_date?: string;
    }>;
    daily_balances?: Array<{ 
      date: string; 
      balance: number;
      starting_balance?: number;
      net_change?: number;
    }>;
  };
}

export const useSafeSpending = (
  reserveAmountInput: number = 0, 
  excludeTodayTransactions: boolean = false, 
  useAvailableBalance: boolean = true,
  daysToProject: number = 90
) => {
  const [data, setData] = useState<SafeSpendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use centralized calendar events - same as Dashboard chart
  const { calendarEvents, startingBalance, isLoading: eventsLoading } = useCalendarEvents();

  const fetchSafeSpending = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        return;
      }

      // Get reserve amount from database
      const { data: settings } = await supabase
        .from('user_settings')
        .select('safe_spending_reserve')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const reserve = Number(settings?.safe_spending_reserve || 0);

      console.log('📊 [useSafeSpending] Using shared calendar balance calculation:', {
        startingBalance,
        totalEvents: calendarEvents.length,
        reserve,
        daysToProject
      });

      // Calculate daily balances using shared function (same as chart)
      const { dailyBalances, minimumBalance, minimumDate } = calculateCalendarBalances(
        startingBalance,
        calendarEvents,
        daysToProject
      );

      console.log('💰 [useSafeSpending] Balance projection:', {
        minimumBalance,
        minimumDate,
        dailyBalancesCount: dailyBalances.length
      });

      // Calculate safe spending limit
      const safeSpendingLimit = Math.max(0, minimumBalance - reserve);
      
      // Find when safe spending is available (earliest date with enough balance)
      const safeSpendingAvailableDate = dailyBalances.find(
        day => day.runningBalance >= (safeSpendingLimit + reserve)
      )?.date || dailyBalances[0]?.date;

      // Detect buying opportunities - peaks where spending is safe
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allBuyingOpportunities: Array<{
        date: string;
        lowPointDate: string;
        balance: number;
        available_date?: string;
      }> = [];

      // Scan through all future days to find opportunities (peaks/plateaus)
      for (let i = 1; i < dailyBalances.length; i++) {
        const currentDay = dailyBalances[i];
        const prevDay = dailyBalances[i - 1];
        const nextDay = dailyBalances[i + 1];
        
        const currentDate = new Date(currentDay.date);
        
        // Only look at future dates
        if (currentDate <= today) continue;
        
        // An opportunity exists if:
        // 1. Balance increased from previous day (fresh money arrived), OR
        // 2. We're at a peak/plateau (next day balance drops or stays same)
        const isIncrease = currentDay.runningBalance > prevDay.runningBalance;
        const isPeakOrPlateau = !nextDay || nextDay.runningBalance <= currentDay.runningBalance;
        
        if (isIncrease || isPeakOrPlateau) {
          const opportunityAmount = Math.max(0, currentDay.runningBalance - reserve);
          
          if (opportunityAmount <= 0) continue;
          
          // Find earliest date when this amount can safely be spent
          let earliestAvailableDate = currentDay.date;
          
          for (let j = 0; j <= i; j++) {
            let canSpendOnDayJ = true;
            
            // Check if spending on day j keeps all days j through i above reserve
            for (let k = j; k <= i; k++) {
              const balanceAfterSpending = dailyBalances[k].runningBalance - opportunityAmount;
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
            date: currentDay.date, // When funds are available (peak date)
            lowPointDate: minimumDate, // Actual lowest point in 90-day projection
            balance: opportunityAmount,
            available_date: earliestAvailableDate
          });
        }
      }

      // Deduplicate opportunities with same balance on consecutive days
      const uniqueOpportunities = allBuyingOpportunities.reduce((acc, opp) => {
        const existingIndex = acc.findIndex(existing => 
          Math.abs(existing.balance - opp.balance) < 0.01
        );
        
        if (existingIndex === -1) {
          acc.push(opp);
        } else {
          const existing = acc[existingIndex];
          if (new Date(opp.date) < new Date(existing.date)) {
            acc[existingIndex] = opp;
          }
        }
        
        return acc;
      }, [] as typeof allBuyingOpportunities);

      // Sort by date ascending
      uniqueOpportunities.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      console.log('💰 [useSafeSpending] Buying opportunities detected:', {
        total: uniqueOpportunities.length,
        opportunities: uniqueOpportunities.map(o => ({
          date: o.date,
          amount: o.balance,
          availableDate: o.available_date,
          lowPointDate: o.lowPointDate
        }))
      });

      const nextBuyingOpportunity = uniqueOpportunities.length > 0 ? uniqueOpportunities[0] : null;

      // Find the first day balance goes below safe spending limit
      const firstBelowLimitDay = dailyBalances.find(day => day.runningBalance < safeSpendingLimit + reserve);
      
      // Find the first day balance goes negative
      const firstNegativeDay = dailyBalances.find(day => day.runningBalance < 0);
      
      // Determine warning state
      const willGoNegative = firstNegativeDay !== undefined;
      const willDropBelowLimit = firstBelowLimitDay !== undefined && !willGoNegative;

      setData({
        safe_spending_limit: safeSpendingLimit,
        reserve_amount: reserve,
        will_go_negative: willGoNegative || willDropBelowLimit,
        negative_date: willGoNegative 
          ? firstNegativeDay!.date 
          : (willDropBelowLimit ? firstBelowLimitDay!.date : null),
        calculation: {
          available_balance: startingBalance,
          lowest_projected_balance: minimumBalance,
          lowest_balance_date: minimumDate,
          safe_spending_available_date: safeSpendingAvailableDate,
          next_buying_opportunity_balance: nextBuyingOpportunity?.balance,
          next_buying_opportunity_date: nextBuyingOpportunity?.date,
          next_buying_opportunity_available_date: nextBuyingOpportunity?.available_date,
          all_buying_opportunities: uniqueOpportunities,
          daily_balances: dailyBalances.map(day => ({
            date: day.date,
            balance: day.runningBalance,
            starting_balance: day.runningBalance - day.dailyChange,
            net_change: day.dailyChange
          }))
        }
      });
    } catch (err) {
      console.error("❌ Safe Spending Error:", err);
      setError(err instanceof Error ? err.message : "Failed to calculate safe spending");
    } finally {
      setIsLoading(false);
    }
  }, [calendarEvents, startingBalance, daysToProject]);

  useEffect(() => {
    if (!eventsLoading) {
      fetchSafeSpending();
    }
  }, [fetchSafeSpending, eventsLoading]);

  return {
    data,
    isLoading: isLoading || eventsLoading,
    error,
    refetch: fetchSafeSpending
  };
};
