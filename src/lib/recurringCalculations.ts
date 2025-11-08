import { generateRecurringDates } from './recurringDates';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { RecurringTransaction } from './recurringDates';

/**
 * Calculate the exact monthly amount for a recurring transaction based on
 * actual calendar occurrences in the specified month
 */
export function calculateMonthlyAmount(
  recurringExpense: RecurringTransaction,
  forMonth: Date = new Date()
): number {
  const monthStart = startOfMonth(forMonth);
  const monthEnd = endOfMonth(forMonth);
  
  const occurrences = generateRecurringDates(
    recurringExpense,
    monthStart,
    monthEnd
  );
  
  return occurrences.length * recurringExpense.amount;
}
