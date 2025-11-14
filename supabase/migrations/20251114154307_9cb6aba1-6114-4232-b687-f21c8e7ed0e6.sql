-- Add archived column to transactions table (if not exists)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Add archived column to income table (if not exists)
ALTER TABLE public.income 
ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Add archived column to bank_transactions table (if not exists)
ALTER TABLE public.bank_transactions 
ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_archived ON public.transactions(archived, user_id);
CREATE INDEX IF NOT EXISTS idx_income_archived ON public.income(archived, user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_archived ON public.bank_transactions(archived);

-- Add comments for documentation
COMMENT ON COLUMN public.transactions.archived IS 'Whether this transaction has been archived';
COMMENT ON COLUMN public.income.archived IS 'Whether this income record has been archived';
COMMENT ON COLUMN public.bank_transactions.archived IS 'Whether this bank transaction has been matched and archived';