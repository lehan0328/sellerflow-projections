import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateCalendarBalances } from '@/lib/calendarBalances';
import { useCalendarEvents } from './useCalendarEvents';

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

  const { calendarEvents, startingBalance, isLoading: eventsLoading } = useCalendarEvents();

  const fetchSafeSpending = useCallback(async () => {
    if (eventsLoading) return;

    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('safe_spending_reserve')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const reserve = Number(settings?.safe_spending_reserve || 0);
      const { dailyBalances: sharedDailyBalances, minimumBalance, minimumDate } = calculateCalendarBalances(
        startingBalance, calendarEvents, daysToProject
      );

      const dailyBalances = sharedDailyBalances.map(day => ({
        date: day.date,
        balance: day.runningBalance,
        starting_balance: day.runningBalance - day.dailyChange,
        net_change: day.dailyChange
      }));

      const allBuyingOpportunities: Array<{ date: string; lowPointDate: string; balance: number; available_date?: string }> = [];
      const todayCheck = new Date();
      todayCheck.setHours(0, 0, 0, 0);
      
      for (let i = 1; i < dailyBalances.length; i++) {
        const currentDay = dailyBalances[i];
        const prevDay = dailyBalances[i - 1];
        const nextDay = dailyBalances[i + 1];
        const currentDate = new Date(currentDay.date);
        
        if (currentDate <= todayCheck) continue;
        
        const isIncrease = currentDay.balance > prevDay.balance;
        const isPeakOrPlateau = !nextDay || nextDay.balance <= currentDay.balance;
        
        if (isIncrease || isPeakOrPlateau) {
          const opportunityAmount = Math.max(0, currentDay.balance - reserve);
          if (opportunityAmount > 0) {
            let earliestAvailableDate = currentDay.date;
            for (let j = 0; j <= i; j++) {
              let canSpend = true;
              for (let k = j; k <= i; k++) {
                if (dailyBalances[k].balance - opportunityAmount < reserve) {
                  canSpend = false;
                  break;
                }
              }
              if (canSpend) {
                earliestAvailableDate = dailyBalances[j].date;
                break;
              }
            }
            allBuyingOpportunities.push({
              date: currentDay.date,
              lowPointDate: minimumDate,
              balance: opportunityAmount,
              available_date: earliestAvailableDate
            });
          }
        }
      }

      const uniqueOpportunities = allBuyingOpportunities.reduce((acc, opp) => {
        const existingIndex = acc.findIndex(e => Math.abs(e.balance - opp.balance) < 0.01);
        if (existingIndex === -1) {
          acc.push(opp);
        } else if (new Date(opp.date) < new Date(acc[existingIndex].date)) {
          acc[existingIndex] = opp;
        }
        return acc;
      }, [] as typeof allBuyingOpportunities);
      
      uniqueOpportunities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const finalOpportunities = uniqueOpportunities.filter(o => o.balance > 0);

      setData({
        safe_spending_limit: Math.max(0, minimumBalance - reserve),
        reserve_amount: reserve,
        will_go_negative: minimumBalance < 0,
        negative_date: minimumBalance < 0 ? minimumDate : null,
        calculation: {
          available_balance: startingBalance,
          lowest_projected_balance: minimumBalance,
          lowest_balance_date: minimumDate,
          safe_spending_available_date: minimumDate,
          next_buying_opportunity_balance: finalOpportunities[0]?.balance,
          next_buying_opportunity_date: finalOpportunities[0]?.date,
          next_buying_opportunity_available_date: finalOpportunities[0]?.available_date,
          all_buying_opportunities: finalOpportunities,
          daily_balances: dailyBalances
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate");
    } finally {
      setIsLoading(false);
    }
  }, [calendarEvents, startingBalance, eventsLoading, daysToProject]);

  useEffect(() => { fetchSafeSpending(); }, [fetchSafeSpending]);
  useEffect(() => {
    const channel = supabase.channel('safe-spending-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchSafeSpending)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income' }, fetchSafeSpending)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, fetchSafeSpending)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSafeSpending]);

  return { data, isLoading, error, refetch: fetchSafeSpending };
};
