import { format, addDays } from 'date-fns';

export interface CalendarEvent {
  date: Date;
  balanceImpactDate?: Date;
  type: string;
  amount: number;
  vendor?: string;
  source?: string;
  description?: string;
  creditCardId?: string | null;
}

export interface DailyBalance {
  date: string;
  runningBalance: number;
  dailyChange: number;
  dailyInflow: number;
  dailyOutflow: number;
  events: number;
}

export const calculateCalendarBalances = (
  startingBalance: number,
  calendarEvents: CalendarEvent[],
  daysToProject: number = 90
): { dailyBalances: DailyBalance[]; minimumBalance: number; minimumDate: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = addDays(today, daysToProject);
  
  const dailyBalances: DailyBalance[] = [];
  let runningBalance = startingBalance;
  let minBalance = startingBalance;
  let minDate = format(today, 'yyyy-MM-dd');
  
  let currentDate = new Date(today);
  while (currentDate <= endDate) {
    currentDate.setHours(0, 0, 0, 0);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    // Get all events that impact balance on this day
    const dayEvents = calendarEvents.filter(event => {
      const impactDate = event.balanceImpactDate || event.date;
      return format(impactDate, 'yyyy-MM-dd') === dateStr;
    });
    
    // Calculate net change for the day
    const dailyInflow = dayEvents.filter(e => e.type === 'inflow').reduce((sum, e) => sum + e.amount, 0);
    // Exclude credit card purchases from cash outflow (they affect credit line instead)
    const dailyOutflow = dayEvents.filter(e => e.type !== 'inflow' && !e.creditCardId).reduce((sum, e) => sum + e.amount, 0);
    const dailyChange = dailyInflow - dailyOutflow;
    
    runningBalance += dailyChange;
    
    dailyBalances.push({
      date: dateStr,
      runningBalance,
      dailyChange,
      dailyInflow,
      dailyOutflow,
      events: dayEvents.length
    });
    
    // Track minimum
    if (runningBalance < minBalance) {
      minBalance = runningBalance;
      minDate = dateStr;
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  return {
    dailyBalances,
    minimumBalance: minBalance,
    minimumDate: minDate
  };
};
