import { format, addDays, startOfDay } from "date-fns";

interface CashFlowEvent {
  id: string;
  type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order';
  amount: number;
  description: string;
  date: Date;
  balanceImpactDate?: Date;
  affectsBalance?: boolean;
}

export interface ChartDailyBalance {
  date: string;
  projected_balance: number;
  net_change: number;
  starting_balance: number;
}

export const calculateChartBalances = (
  events: CashFlowEvent[],
  startingBalance: number,
  daysToProject: number = 91,
  excludeToday: boolean = false
): ChartDailyBalance[] => {
  console.log('🧮 [chartDataProcessor] Starting calculation:', {
    totalEvents: events.length,
    startingBalance,
    daysToProject,
    excludeToday
  });
  
  const dailyBalances: ChartDailyBalance[] = [];
  const today = startOfDay(new Date());
  let runningBalance = startingBalance;

  for (let i = 0; i < daysToProject; i++) {
    const currentDate = addDays(today, i);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const isToday = i === 0;
    
    // Get all events that impact balance on this day
    const dayEvents = events.filter(event => {
      const impactDate = event.balanceImpactDate || event.date;
      const impactDateStr = format(startOfDay(impactDate), 'yyyy-MM-dd');
      return impactDateStr === dateStr;
    });
    
    // Calculate net change for the day
    const dailyInflow = dayEvents
      .filter(e => e.type === 'inflow')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const dailyOutflow = dayEvents
      .filter(e => e.type !== 'inflow')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const netChange = dailyInflow - dailyOutflow;
    
    // Log specific dates for debugging
    if (dateStr === '2026-01-31' || dateStr === '2026-01-30') {
      console.log(`🧮 [chartDataProcessor] ${dateStr}:`, {
        isToday,
        dayEvents: dayEvents.length,
        inflow: dailyInflow,
        outflow: dailyOutflow,
        netChange,
        runningBalanceBefore: runningBalance,
        excludeToday,
        willAddChange: !isToday || !excludeToday
      });
    }
    
    // Match CashFlowCalendar logic exactly:
    // For today: runningBalance = startingBalance + (excludeToday ? 0 : netChange)
    // For future days: runningBalance += netChange
    if (isToday) {
      runningBalance = startingBalance + (excludeToday ? 0 : netChange);
    } else {
      runningBalance += netChange;
    }
    
    if (dateStr === '2026-01-31' || dateStr === '2026-01-30') {
      console.log(`🧮 [chartDataProcessor] ${dateStr} RESULT:`, {
        projected_balance: runningBalance
      });
    }
    
    dailyBalances.push({
      date: dateStr,
      starting_balance: isToday ? startingBalance : dailyBalances[i - 1]?.projected_balance || startingBalance,
      net_change: netChange,
      projected_balance: runningBalance,
    });
  }

  return dailyBalances;
};
