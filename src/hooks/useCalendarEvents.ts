import { useMemo } from 'react';
import { startOfDay, addDays } from 'date-fns';
import { useVendors } from './useVendors';
import { useTransactions } from './useTransactions';
import { useIncome } from './useIncome';
import { useCreditCards } from './useCreditCards';
import { useRecurringExpenses } from './useRecurringExpenses';
import { useAmazonPayouts } from './useAmazonPayouts';
import { useBankAccounts } from './useBankAccounts';
import { generateRecurringDates } from '@/lib/recurringDates';
import { CalendarEvent } from '@/lib/calendarBalances';

interface CalendarEventsResult {
  calendarEvents: CalendarEvent[];
  startingBalance: number;
  isLoading: boolean;
  error: string | null;
}

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
  const { bankAccounts } = useBankAccounts();

  // Get starting balance from first active bank account
  const startingBalance = useMemo(() => {
    const activeAccounts = bankAccounts.filter(acc => acc.is_active);
    return activeAccounts.length > 0 ? activeAccounts[0].balance : 0;
  }, [bankAccounts]);

  // Check loading states
  const isLoading = false; // All hooks handle their own loading

  // Build all calendar events
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // 1. Vendor transaction events (purchase orders with due dates)
    const vendorEvents = transactions
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
          id: tx.id,
          date: new Date(eventDate),
          type: "outflow",
          amount: tx.amount,
          description: tx.description || `${vendor?.name || "Vendor"} - Payment Due`,
          vendor: vendor?.name,
          creditCardId: tx.creditCardId,
        } as CalendarEvent;
      });
    events.push(...vendorEvents);

    // 2. Income events (exclude received income)
    const incomeEvents = incomeItems
      .filter((income) => income.status !== "received")
      .map((income) => ({
        id: income.id,
        date: new Date(income.paymentDate),
        type: "inflow",
        amount: income.amount,
        description: income.description,
        source: income.source,
      } as CalendarEvent));
    events.push(...incomeEvents);

    // 3. Credit card payment events (current month)
    const creditCardEvents = creditCards
      .filter((card) => card.payment_due_date && card.balance > 0)
      .map((card) => {
        const paymentAmount = card.pay_minimum
          ? card.minimum_payment
          : card.statement_balance || card.balance;

        return {
          id: `credit-payment-${card.id}`,
          date: new Date(card.payment_due_date!),
          type: "credit-payment",
          amount: paymentAmount,
          description: `${card.institution_name} - ${card.account_name} Payment${card.pay_minimum ? " (Min Only)" : ""}`,
        } as CalendarEvent;
      });
    events.push(...creditCardEvents);

    // 4. Forecasted next month credit card payments
    const forecastedCreditCardEvents = creditCards
      .filter((card) => card.forecast_next_month && card.payment_due_date)
      .map((card) => {
        const projectedAmount =
          card.credit_limit -
          card.available_credit -
          (card.statement_balance || card.balance);

        if (projectedAmount <= 0) return null;

        const nextDueDate = new Date(card.payment_due_date!);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);

        return {
          id: `credit-forecast-${card.id}`,
          date: nextDueDate,
          type: "credit-payment",
          amount: projectedAmount,
          description: `${card.institution_name} - ${card.account_name} (Forecasted)`,
        } as CalendarEvent;
      })
      .filter(Boolean) as CalendarEvent[];
    events.push(...forecastedCreditCardEvents);

    // 5. Vendor payment events (actual cash outflows)
    const vendorPaymentEvents = transactions
      .filter((t) => t.type === "vendor_payment")
      .map((t) => ({
        id: t.id,
        date: new Date(t.transactionDate),
        type: "outflow",
        amount: t.amount,
        description: t.description,
        vendor: t.vendorId ? vendors.find((v) => v.id === t.vendorId)?.name : undefined,
      } as CalendarEvent));
    events.push(...vendorPaymentEvents);

    // 6. Expense events
    const expenseEvents = transactions
      .filter((t) => t.type === "expense")
      .map((t) => ({
        id: t.id,
        date: new Date(t.transactionDate),
        type: "outflow",
        amount: t.amount,
        description: t.description,
        vendor: "Expense",
      } as CalendarEvent));
    events.push(...expenseEvents);

    // 7. Recurring transaction events (next 12 months)
    const rangeStart = startOfDay(new Date());
    const rangeEnd = addDays(rangeStart, 365);

    recurringExpenses.forEach((recurring) => {
      const dates = generateRecurringDates(recurring, rangeStart, rangeEnd);

      dates.forEach((date) => {
        events.push({
          id: `recurring-${recurring.id}-${date.getTime()}`,
          date: date,
          type: recurring.type === "income" ? "inflow" : "outflow",
          amount: Number(recurring.amount),
          description: recurring.transaction_name || recurring.name,
          source: recurring.type === "income" ? "Recurring" : undefined,
          vendor: recurring.type === "expense" ? "Recurring" : undefined,
        } as CalendarEvent);
      });
    });

    // 8. Amazon payout events with proper T+1 handling
    const amazonPayoutEvents = amazonPayouts
      .filter((payout) => {
        // Always include forecasted payouts in calendar events
        if ((payout.status as string) === "forecasted") {
          const payoutDate = new Date(`${payout.payout_date}T00:00:00`);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          payoutDate.setHours(0, 0, 0, 0);
          if (payoutDate < today) return false;
        }

        // Allow rolled_over forecasts to display
        if ((payout.status as string) === "rolled_over") {
          return true;
        }

        // Exclude open settlements ONLY for daily accounts
        if ((payout.status as string) === "estimated") {
          const accountFrequency = payout.amazon_accounts?.payout_frequency;
          const rawData = (payout as any).raw_settlement_data;
          const hasEndDate = !!(
            rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date
          );

          if (accountFrequency === "daily" && !hasEndDate) {
            return false;
          }
        }

        return true;
      })
      .map((payout) => {
        const isOpenSettlement = (payout.status as string) === "estimated";
        const isForecastedPayout = (payout.status as string) === "forecasted";
        const isConfirmedPayout = (payout.status as string) === "confirmed";

        let displayDate: Date;

        if (isConfirmedPayout) {
          // For confirmed payouts, calculate from settlement end date + 1 day
          const rawData = (payout as any).raw_settlement_data;
          const settlementEndStr =
            rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;

          if (settlementEndStr) {
            displayDate = new Date(settlementEndStr);
            displayDate.setDate(displayDate.getDate() + 1);
          } else {
            displayDate = new Date(payout.payout_date);
          }
        } else if (isOpenSettlement) {
          // For estimated payouts, calculate from settlement end date + 1 day
          const rawData = (payout as any).raw_settlement_data;
          const settlementEndStr =
            rawData?.FinancialEventGroupEnd || rawData?.settlement_end_date;
          const settlementStartStr =
            rawData?.settlement_start_date || rawData?.FinancialEventGroupStart;

          if (settlementEndStr) {
            displayDate = new Date(settlementEndStr);
          } else if (settlementStartStr) {
            const settlementStartDate = new Date(settlementStartStr);
            const settlementCloseDate = new Date(settlementStartDate);
            settlementCloseDate.setDate(settlementCloseDate.getDate() + 14);
            displayDate = settlementCloseDate;
          } else {
            displayDate = new Date(`${payout.payout_date}T00:00:00`);
          }

          // Add +1 day for bank transfer
          displayDate = new Date(displayDate);
          displayDate.setDate(displayDate.getDate() + 1);
        } else {
          // For forecasted payouts, use date as-is
          displayDate = new Date(`${payout.payout_date}T00:00:00`);
        }

        const description =
          (payout.status as string) === "forecasted"
            ? `Amazon Payout (Forecasted) - ${payout.marketplace_name}`
            : isOpenSettlement
            ? `Amazon Settlement (In Progress) - ${payout.marketplace_name}`
            : `Amazon Payout - ${payout.marketplace_name}`;

        // For forecasted payouts, add +1 day for balance impact (bank transfer time)
        const balanceImpactDate =
          (payout.status as string) === "forecasted"
            ? new Date(new Date(displayDate).setDate(displayDate.getDate() + 1))
            : displayDate;

        return {
          id: payout.id,
          date: displayDate,
          balanceImpactDate,
          type: "inflow",
          amount: payout.total_amount,
          description,
          source:
            (payout.status as string) === "forecasted"
              ? "Amazon-Forecasted"
              : "Amazon",
        } as CalendarEvent;
      });
    events.push(...amazonPayoutEvents);

    console.log('📅 [useCalendarEvents] Generated calendar events:', {
      total: events.length,
      vendorEvents: vendorEvents.length,
      incomeEvents: incomeEvents.length,
      creditCardEvents: creditCardEvents.length + forecastedCreditCardEvents.length,
      recurringEvents: events.filter(e => e.id.toString().startsWith('recurring-')).length,
      amazonEvents: amazonPayoutEvents.length,
      startingBalance
    });

    return events;
  }, [vendors, transactions, incomeItems, creditCards, recurringExpenses, amazonPayouts, startingBalance]);

  return {
    calendarEvents,
    startingBalance,
    isLoading,
    error: null,
  };
};
