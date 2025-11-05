import { addDays, addWeeks, addMonths, addYears, startOfDay, isBefore, isAfter, getDay } from 'date-fns';

export type RecurringFrequency = 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | '2-months' | '3-months' | 'weekdays';

export interface RecurringTransaction {
  id: string;
  transaction_name: string;
  amount: number;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  type: 'income' | 'expense';
}

/**
 * Generate all occurrence dates for a recurring transaction within a date range
 */
export function generateRecurringDates(
  transaction: RecurringTransaction,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  if (!transaction.is_active) return [];

  const dates: Date[] = [];
  
  // Parse dates locally to avoid timezone shifts
  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return startOfDay(new Date(year, month - 1, day));
  };
  
  const startDate = parseLocalDate(transaction.start_date);
  const endDate = transaction.end_date ? parseLocalDate(transaction.end_date) : null;
  
  let currentDate = startDate;
  const maxIterations = 1000; // Safety limit
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    // Check if we've passed the transaction end date
    if (endDate && isAfter(currentDate, endDate)) break;

    // Check if we've passed the range end
    if (isAfter(currentDate, rangeEnd)) break;

    // If current date is within our range, add it
    if (!isBefore(currentDate, rangeStart) && !isAfter(currentDate, rangeEnd)) {
      dates.push(new Date(currentDate));
    }

    // Calculate next occurrence based on frequency
    switch (transaction.frequency) {
      case 'daily':
        currentDate = addDays(currentDate, 1);
        break;

      case 'weekly':
        currentDate = addWeeks(currentDate, 1);
        break;

      case 'bi-weekly':
        currentDate = addWeeks(currentDate, 2);
        break;

      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;

      case '2-months':
        currentDate = addMonths(currentDate, 2);
        break;

      case '3-months':
        currentDate = addMonths(currentDate, 3);
        break;

      case 'weekdays':
        // Move to next day
        currentDate = addDays(currentDate, 1);
        // Skip weekends (Saturday = 6, Sunday = 0)
        while (getDay(currentDate) === 0 || getDay(currentDate) === 6) {
          currentDate = addDays(currentDate, 1);
        }
        break;

      default:
        // Unknown frequency, stop
        return dates;
    }
  }

  return dates;
}

/**
 * Get the next occurrence date for a recurring transaction after a given date
 */
export function getNextOccurrence(
  transaction: RecurringTransaction,
  afterDate: Date = new Date()
): Date | null {
  const dates = generateRecurringDates(
    transaction,
    afterDate,
    addYears(afterDate, 2) // Look ahead 2 years
  );

  return dates.length > 0 ? dates[0] : null;
}

/**
 * Check if a transaction occurs on a specific date
 */
export function occursOnDate(
  transaction: RecurringTransaction,
  checkDate: Date
): boolean {
  const dates = generateRecurringDates(
    transaction,
    startOfDay(checkDate),
    startOfDay(checkDate)
  );

  return dates.length > 0;
}
