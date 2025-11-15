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

// Helper function to calculate next credit card due date
const getNextCreditCardDueDate = (statementCloseDate: string, currentDueDate?: string): string | null => {
  const closeDate = new Date(statementCloseDate);
  const today = new Date();
  
  // Calculate next statement close date
  const nextCloseDate = new Date(closeDate);
  nextCloseDate.setMonth(nextCloseDate.getMonth() + 1);
  
  if (currentDueDate) {
    const dueDate = new Date(currentDueDate);
    const nextDueDate = new Date(dueDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    
    // Only return if it's in the future
    if (nextDueDate > today) {
      return nextDueDate.toISOString().split('T')[0];
    }
  }
  
  return null;
};

/**
 * Centralized calendar events hook - used by both Dashboard chart
 * and safe spending calculations to ensure 100% consistency.
 * 
 * Amazon payout timing:
 * - Confirmed: settlement_end + 1 day (funds hit bank)
 * - Estimated: settlement_end + 1 day (funds hit bank)
 * - Forecasted: payout_date + 1 day (forecast includes bank transfer)
 */
export const useCalendarEvents = (): CalendarEventsResult => {
  const { vendors } = useVendors();
  const { transactions } = useTransactions();
  const { incomeItems } = useIncome();
  const { creditCards } = useCreditCards();
  const { recurringExpenses } = useRecurringExpenses();
  const { amazonPayouts } = useAmazonPayouts();
  const { totalBalance: bankAccountBalance, accounts } = useBankAccounts();
  const { cashFlowEvents } = useCashFlowEvents();

  const calendarEvents = useMemo(() => {
    // Convert cash flow events to calendar format
    const baseCalendarEvents: CalendarEvent[] = cashFlowEvents;

    // Convert vendor transactions to calendar events (only show POs with vendors assigned)
    const vendorEvents: CalendarEvent[] = transactions
      .filter((tx) => {
        if (tx.type !== "purchase_order" || !tx.vendorId) return false;
        if (tx.status === "completed") return false;
        if (tx.description?.endsWith(".1")) return false;
        const dbStatus = (tx as any).status;
        if (dbStatus === "partially_paid") return false;
        return true;
      })
      .map((tx) => {
        const vendor = vendors.find((v) => v.id === tx.vendorId);
        const eventDate = tx.dueDate || tx.transactionDate;

        return {
          id: `vendor-tx-${tx.id}`,
          type: "outflow" as const,
          amount: tx.amount,
          description: tx.description || `${vendor?.name || "Vendor"} - Payment Due`,
          vendor: vendor?.name,
          creditCardId: tx.creditCardId,
          date: new Date(eventDate),
        };
      });

    // Convert income items to calendar events (exclude received income)
    const incomeEvents: CalendarEvent[] = incomeItems
      .filter((item) => item.status !== "received")
      .map((item) => ({
        id: `income-${item.id}`,
        type: "inflow" as const,
        amount: item.amount,
        description: item.description || "Income",
        source: item.source,
        date: new Date(item.payment_date),
      }));

    // Credit card payment events - current month due payments
    const creditCardEvents: CalendarEvent[] = creditCards
      .filter((card) => card.is_active && card.payment_due_date)
      .map((card) => {
        const paymentAmount = card.pay_minimum
          ? card.minimum_payment || 0
          : card.statement_balance || card.balance;

        return {
          id: `credit-card-${card.id}`,
          type: "outflow" as const,
          amount: paymentAmount,
          description: `${card.account_name} Payment`,
          source: "Credit Card",
          date: new Date(card.payment_due_date!),
        };
      });

    // Forecasted credit card payments for next month
    const forecastedCreditCardEvents: CalendarEvent[] = creditCards
      .filter(
        (card) =>
          card.is_active &&
          card.forecast_next_month &&
          card.statement_close_date
      )
      .map((card) => {
        const nextDueDates = getCreditCardDueDates(
          card.statement_close_date!,
          card.payment_due_date || undefined
        );

        if (!nextDueDates.nextPaymentDue) return null;

        const paymentAmount = card.pay_minimum
          ? card.minimum_payment || 0
          : card.statement_balance || card.balance;

        return {
          id: `credit-card-forecast-${card.id}`,
          type: "outflow" as const,
          amount: paymentAmount,
          description: `${card.account_name} Payment (Forecasted)`,
          source: "Credit Card",
          date: new Date(nextDueDates.nextPaymentDue),
        };
      })
      .filter((event): event is CalendarEvent => event !== null);

    // Vendor payment events (actual cash outflows)
    const vendorPaymentEvents: CalendarEvent[] = transactions
      .filter((tx) => {
        if (tx.type !== "vendor_payment") return false;
        if (tx.description?.endsWith(".1")) return false;
        const dbStatus = (tx as any).status;
        if (dbStatus === "partially_paid") return false;
        return true;
      })
      .map((tx) => {
        const vendor = tx.vendorId
          ? vendors.find((v) => v.id === tx.vendorId)
          : null;

        return {
          type: "outflow" as const,
          amount: tx.amount,
          description: tx.description || `${vendor?.name || "Vendor"} - Payment`,
          vendor: vendor?.name,
          creditCardId: tx.creditCardId,
          date: new Date(tx.transactionDate),
        };
      });

    // Expense events
    const expenseEvents: CalendarEvent[] = transactions
      .filter((tx) => {
        if (tx.type !== "expense") return false;
        if (tx.description?.endsWith(".1")) return false;
        const dbStatus = (tx as any).status;
        if (dbStatus === "partially_paid") return false;
        return true;
      })
      .map((tx) => ({
        type: "outflow" as const,
        amount: tx.amount,
        description: tx.description || "Expense",
        creditCardId: tx.creditCardId,
        date: new Date(tx.transactionDate),
      }));

    // Recurring transaction events (next 12 months)
    const today = new Date();
    const endDate = addDays(today, 365);
    const recurringEvents: CalendarEvent[] = recurringExpenses.flatMap((expense) => {
      if (expense.status !== "active") return [];

      const dates = generateRecurringDates(
        new Date(expense.start_date),
        expense.frequency,
        today,
        endDate
      );

      return dates.map((date, index) => ({
        id: `recurring-${expense.id}-${index}`,
        type: "outflow" as const,
        amount: expense.amount,
        description: `${expense.name} (Recurring)`,
        vendor: expense.vendor_id
          ? vendors.find((v) => v.id === expense.vendor_id)?.name
          : undefined,
        date,
      }));
    });

    // Amazon payout events with proper T+1 bank transfer handling
    const amazonPayoutEvents: CalendarEvent[] = amazonPayouts
      .filter((payout) => {
        // Skip if payout is in the past
        const payoutDate = new Date(payout.payout_date);
        if (payoutDate < today) return false;

        // Include forecasted payouts
        if ((payout.status as string) === "forecasted") return true;

        // Include confirmed and estimated payouts
        if (payout.status === "confirmed" || payout.status === "estimated") return true;

        return false;
      })
      .map((payout) => {
        const isOpenSettlement = payout.status === "estimated";

        // For confirmed/estimated: use settlement_end date for display
        // For forecasted: use payout_date for display
        const displayDate =
          (payout.status as string) === "forecasted"
            ? new Date(payout.payout_date)
            : payout.raw_settlement_data &&
              (payout.raw_settlement_data as any).SettlementData?.SettlementPeriodEndDate
            ? new Date((payout.raw_settlement_data as any).SettlementData.SettlementPeriodEndDate)
            : new Date(payout.payout_date);

        const description =
          (payout.status as string) === "forecasted"
            ? `Amazon Payout (Forecasted) - ${payout.marketplace_name}`
            : isOpenSettlement
            ? `Amazon Settlement (In Progress) - ${payout.marketplace_name}`
            : `Amazon Payout - ${payout.marketplace_name}`;

        // For ALL payouts: add +1 day for balance impact (bank transfer time)
        // Confirmed/Estimated: settlement_end + 1 day
        // Forecasted: payout_date + 1 day
        const balanceImpactDate = new Date(displayDate);
        balanceImpactDate.setDate(balanceImpactDate.getDate() + 1);

        return {
          type: "inflow" as const,
          amount: payout.total_amount,
          description,
          source:
            (payout.status as string) === "forecasted"
              ? "Amazon-Forecasted"
              : "Amazon",
          date: displayDate,
          balanceImpactDate,
        };
      });

    // Combine all events
    return [
      ...baseCalendarEvents,
      ...vendorPaymentEvents,
      ...expenseEvents,
      ...vendorEvents,
      ...incomeEvents,
      ...creditCardEvents,
      ...forecastedCreditCardEvents,
      ...recurringEvents,
      ...amazonPayoutEvents,
    ];
  }, [
    cashFlowEvents,
    transactions,
    vendors,
    incomeItems,
    creditCards,
    recurringExpenses,
    amazonPayouts,
  ]);

  // Calculate total available balance
  const totalAvailableBalance = accounts.reduce((sum, account) => {
    return sum + (account.available_balance ?? account.balance);
  }, 0);

  return {
    calendarEvents,
    startingBalance: bankAccountBalance,
    isLoading: false,
    error: null,
  };
};
