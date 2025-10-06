-- Add transaction_name and type columns to recurring_expenses
ALTER TABLE public.recurring_expenses 
ADD COLUMN IF NOT EXISTS transaction_name TEXT,
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'expense';

-- Add bi-weekly and weekdays frequency support
ALTER TABLE public.recurring_expenses 
DROP CONSTRAINT IF EXISTS recurring_expenses_frequency_check;

ALTER TABLE public.recurring_expenses 
ADD CONSTRAINT recurring_expenses_frequency_check 
CHECK (frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly', 'yearly', 'weekdays'));