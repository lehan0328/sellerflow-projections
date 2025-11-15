import { useMemo } from 'react';
import { addDays } from 'date-fns';
import { useVendors } from './useVendors';
import { useTransactions } from './useTransactions';
import { useIncome } from './useIncome';
import { useCreditCards } from './useCreditCards';
import { useRecurringExpenses } from './useRecurringExpenses';
import { useAmazonPayouts } from './useAmazonPayouts';
import { useBankAccounts } from './useBankAccounts';
import { useCashFlowEvents } from './useCashFlowEvents';
import { generateRecurringDates } from '@/lib/recurringDates';
import type { CalendarEvent } from '@/lib/calendarBalances';

interface CalendarEventsResult {
  calendarEvents: CalendarEvent[];
  startingBalance: number;
  isLoading: boolean;
  error: string | null;
}

export const useCalendarEvents = (): CalendarEventsResult => {
  const { vendors } = useVendors();
  const { transactions } = useTransactions();
  const { incomeItems } = useIncome();
  const { creditCards } = useCreditCards();
  const { recurringExpenses } = useRecurringExpenses();
  const { amazonPayouts } = useAmazonPayouts();
  const { totalBalance: bankAccountBalance } = useBankAccounts();
  const { cashFlowEvents } = useCashFlowEvents();

  const calendarEvents = useMemo(() => {
    const baseEvents: CalendarEvent[] = cashFlowEvents.map(e => ({
      type: e.type,
      amount: e.amount,
      description: e.description || undefined,
      date: new Date(e.event_date),
    }));

    const vendorEvents: CalendarEvent[] = transactions
      .filter(tx => tx.type === "purchase_order" && tx.vendorId && tx.status !== "completed" && !tx.description?.endsWith(".1") && (tx as any).status !== "partially_paid")
      .map(tx => ({
        type: "outflow" as const,
        amount: tx.amount,
        description: tx.description || `${vendors.find(v => v.id === tx.vendorId)?.name || "Vendor"} - Payment Due`,
        vendor: vendors.find(v => v.id === tx.vendorId)?.name,
        creditCardId: tx.creditCardId,
        date: new Date(tx.dueDate || tx.transactionDate),
      }));

    const incomeEvents: CalendarEvent[] = incomeItems
      .filter(item => item.status !== "received")
      .map(item => ({
        type: "inflow" as const,
        amount: item.amount,
        description: item.description || "Income",
        source: item.source,
        date: new Date(item.paymentDate),
      }));

    const creditCardEvents: CalendarEvent[] = creditCards
      .filter(card => card.is_active && card.payment_due_date)
      .map(card => ({
        type: "outflow" as const,
        amount: card.pay_minimum ? (card.minimum_payment || 0) : (card.statement_balance || card.balance),
        description: `${card.account_name} Payment`,
        source: "Credit Card",
        date: new Date(card.payment_due_date!),
      }));

    const forecastedCreditCardEvents: CalendarEvent[] = creditCards
      .filter(card => card.is_active && card.forecast_next_month && card.payment_due_date)
      .map(card => {
        const nextDueDate = new Date(card.payment_due_date!);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        return {
          type: "outflow" as const,
          amount: card.pay_minimum ? (card.minimum_payment || 0) : (card.statement_balance || card.balance),
          description: `${card.account_name} Payment (Forecasted)`,
          source: "Credit Card",
          date: nextDueDate,
        };
      });

    const vendorPaymentEvents: CalendarEvent[] = transactions
      .filter(tx => tx.type === "vendor_payment" && !tx.description?.endsWith(".1") && (tx as any).status !== "partially_paid")
      .map(tx => ({
        type: "outflow" as const,
        amount: tx.amount,
        description: tx.description || `${vendors.find(v => v.id === tx.vendorId)?.name || "Vendor"} - Payment`,
        vendor: vendors.find(v => v.id === tx.vendorId)?.name,
        creditCardId: tx.creditCardId,
        date: new Date(tx.transactionDate),
      }));

    const expenseEvents: CalendarEvent[] = transactions
      .filter(tx => tx.type === "expense" && !tx.description?.endsWith(".1") && (tx as any).status !== "partially_paid")
      .map(tx => ({
        type: "outflow" as const,
        amount: tx.amount,
        description: tx.description || "Expense",
        creditCardId: tx.creditCardId,
        date: new Date(tx.transactionDate),
      }));

    const today = new Date();
    const recurringEvents: CalendarEvent[] = recurringExpenses.flatMap(expense => {
      if (!expense.is_active) return [];
      const dates = generateRecurringDates(new Date(expense.start_date), expense.frequency, today, addDays(today, 365));
      return dates.map((date, idx) => ({
        type: expense.type === 'income' ? 'inflow' as const : 'outflow' as const,
        amount: expense.amount,
        description: `${expense.name} (Recurring)`,
        date: date,
      }));
    });

    const amazonPayoutEvents: CalendarEvent[] = amazonPayouts
      .filter(p => new Date(p.payout_date) >= today && ((p.status as string) === "forecasted" || p.status === "confirmed" || p.status === "estimated"))
      .map(p => {
        const displayDate = (p.status as string) === "forecasted" 
          ? new Date(p.payout_date)
          : (p.raw_settlement_data as any)?.SettlementData?.SettlementPeriodEndDate
            ? new Date((p.raw_settlement_data as any).SettlementData.SettlementPeriodEndDate)
            : new Date(p.payout_date);
        const balanceImpactDate = new Date(displayDate);
        balanceImpactDate.setDate(balanceImpactDate.getDate() + 1);
        return {
          type: "inflow" as const,
          amount: p.total_amount,
          description: (p.status as string) === "forecasted" ? `Amazon Payout (Forecasted) - ${p.marketplace_name}` : `Amazon Payout - ${p.marketplace_name}`,
          source: (p.status as string) === "forecasted" ? "Amazon-Forecasted" : "Amazon",
          date: displayDate,
          balanceImpactDate,
        };
      });

    return [...baseEvents, ...vendorPaymentEvents, ...expenseEvents, ...vendorEvents, ...incomeEvents, ...creditCardEvents, ...forecastedCreditCardEvents, ...recurringEvents, ...amazonPayoutEvents];
  }, [cashFlowEvents, transactions, vendors, incomeItems, creditCards, recurringExpenses, amazonPayouts]);

  return { calendarEvents, startingBalance: bankAccountBalance, isLoading: false, error: null };
};
