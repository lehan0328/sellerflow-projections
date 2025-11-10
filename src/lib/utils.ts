import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalizeName(name: string): string {
  return name
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Parse an ISO date string (YYYY-MM-DD) without timezone conversion
 * This prevents dates from shifting due to timezone offsets
 * @param dateStr - ISO date string in format YYYY-MM-DD
 * @returns Date object representing the date in local timezone
 */
export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a number as currency, hiding decimals for whole numbers
 * @param amount - The amount to format
 * @param showCents - Whether to show cents (default: true)
 * @returns Formatted currency string (e.g., "$1,234.56" or "$1,234")
 */
export function formatCurrency(amount: number, showCents: boolean = true): string {
  const isWholeNumber = amount % 1 === 0;
  const decimals = showCents && !isWholeNumber ? 2 : 0;
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}
