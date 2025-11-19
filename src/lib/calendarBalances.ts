import { format, addDays } from 'date-fns';

export interface CalendarEvent {
  id?: string;
  date: Date;
  balanceImpactDate?: Date;
  type: 'inflow' | 'outflow' | 'credit-payment' | 'purchase-order' | 'credit-overflow' | 'recurring';
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
  cardCredit?: Map<string, number>;
}

export const calculateCalendarBalances = (
  startingBalance: number,
  calendarEvents: CalendarEvent[],
  daysToProject: number = 90,
  excludeToday: boolean = false,
  creditCards: Array<{ id: string; credit_limit: number; credit_limit_override?: number | null; balance: number; account_name: string }> = []
): { dailyBalances: DailyBalance[]; minimumBalance: number; minimumDate: string; overflowEvents: CalendarEvent[] } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = addDays(today, daysToProject);
  
  const dailyBalances: DailyBalance[] = [];
  const overflowEvents: CalendarEvent[] = [];
  let runningBalance = startingBalance;
  let minBalance = Infinity;
  let minDate = format(today, 'yyyy-MM-dd');
  
  // Initialize per-card credit tracking
  const cardCreditMap = new Map<string, number>();
  creditCards.forEach(card => {
    const effectiveLimit = card.credit_limit_override || card.credit_limit;
    const currentAvailable = effectiveLimit - card.balance;
    cardCreditMap.set(card.id, currentAvailable);
  });
  
  let currentDate = new Date(today);
  while (currentDate <= endDate) {
    currentDate.setHours(0, 0, 0, 0);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    // Get all events that impact balance on this day
    const dayEvents = calendarEvents.filter(event => {
      const impactDate = event.balanceImpactDate || event.date;
      const eventDateStr = format(impactDate, 'yyyy-MM-dd');
      // Skip today's events if excludeToday is enabled
      if (excludeToday && eventDateStr === format(today, 'yyyy-MM-dd')) {
        return false;
      }
      return eventDateStr === dateStr;
    });
    
    // Calculate net change for the day
    const dailyInflow = dayEvents.filter(e => e.type === 'inflow').reduce((sum, e) => sum + e.amount, 0);
    // Exclude credit card purchases from cash outflow (they affect credit line instead)
    const dailyOutflow = dayEvents.filter(e => e.type !== 'inflow' && !e.creditCardId).reduce((sum, e) => sum + e.amount, 0);
    const dailyChange = dailyInflow - dailyOutflow;
    
    runningBalance += dailyChange;
    
    // Process credit card purchases for this day (decrease card's available credit)
    const creditCardPurchases = dayEvents.filter(e => e.creditCardId && e.type !== 'credit-payment');
    creditCardPurchases.forEach(purchase => {
      if (purchase.creditCardId) {
        const currentCredit = cardCreditMap.get(purchase.creditCardId) || 0;
        cardCreditMap.set(purchase.creditCardId, currentCredit - purchase.amount);
      }
    });

    // Process credit card payments for this day (increase card's available credit)
    const creditCardPayments = dayEvents.filter(e => e.type === 'credit-payment' && e.creditCardId);
    creditCardPayments.forEach(payment => {
      if (payment.creditCardId) {
        const currentCredit = cardCreditMap.get(payment.creditCardId) || 0;
        cardCreditMap.set(payment.creditCardId, currentCredit + payment.amount);
      }
    });

    // Calculate overflow (cards that went over their limit)
    let totalOverflow = 0;
    cardCreditMap.forEach((availableCredit, cardId) => {
      if (availableCredit < 0) {
        // This card is over its limit - overflow deducts from cash
        const overflowAmount = Math.abs(availableCredit);
        totalOverflow += overflowAmount;
        
        // Create overflow event for visibility
        const card = creditCards.find(c => c.id === cardId);
        overflowEvents.push({
          id: `overflow-${cardId}-${dateStr}`,
          date: new Date(currentDate),
          balanceImpactDate: new Date(currentDate),
          type: 'credit-overflow',
          amount: overflowAmount,
          description: `Credit card over limit`,
          vendor: card?.account_name || 'Unknown Card',
          creditCardId: cardId,
        });
        
        // Reset this card to 0 available credit (can't go negative)
        cardCreditMap.set(cardId, 0);
      }
    });

    // Deduct overflow from running balance for buying opportunities
    runningBalance -= totalOverflow;
    
    dailyBalances.push({
      date: dateStr,
      runningBalance,
      dailyChange,
      dailyInflow,
      dailyOutflow,
      events: dayEvents.length,
      cardCredit: new Map(cardCreditMap)
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
    minimumDate: minDate,
    overflowEvents
  };
};
