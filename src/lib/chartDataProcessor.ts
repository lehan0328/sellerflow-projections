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
  const dailyBalances: ChartDailyBalance[] = [];
  const today = startOfDay(new Date());
  let runningBalance = startingBalance;

  for (let i = 0; i < daysToProject; i++) {
    const currentDate = addDays(today, i);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    const startBalance = runningBalance;
    
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
    
    // Special handling for today (day 0) to match CashFlowCalendar logic
    if (i === 0 && excludeToday) {
      // If excluding today, don't add today's net change to running balance
      dailyBalances.push({
        date: dateStr,
        starting_balance: startBalance,
        net_change: netChange,
        projected_balance: startBalance, // Keep starting balance for today
      });
    } else {
      runningBalance += netChange;
      dailyBalances.push({
        date: dateStr,
        starting_balance: startBalance,
        net_change: netChange,
        projected_balance: runningBalance,
      });
    }
  }

  return dailyBalances;
};
