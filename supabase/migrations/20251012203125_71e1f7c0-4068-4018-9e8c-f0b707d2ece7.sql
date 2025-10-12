-- Add archived column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN archived boolean NOT NULL DEFAULT false;

-- Add archived column to income table
ALTER TABLE public.income 
ADD COLUMN archived boolean NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_transactions_archived ON public.transactions(archived, user_id);
CREATE INDEX idx_income_archived ON public.income(archived, user_id);