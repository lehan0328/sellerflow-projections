-- Add archived column to bank_transactions
ALTER TABLE public.bank_transactions 
ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Add matched_transaction_id to track what this was matched with
ALTER TABLE public.bank_transactions 
ADD COLUMN IF NOT EXISTS matched_transaction_id UUID,
ADD COLUMN IF NOT EXISTS matched_type TEXT CHECK (matched_type IN ('income', 'vendor'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_transactions_archived ON public.bank_transactions(archived);

-- Add comment
COMMENT ON COLUMN public.bank_transactions.archived IS 'Whether this transaction has been matched and archived';
COMMENT ON COLUMN public.bank_transactions.matched_transaction_id IS 'ID of the income or vendor transaction this was matched with';
COMMENT ON COLUMN public.bank_transactions.matched_type IS 'Type of transaction this was matched with (income or vendor)';