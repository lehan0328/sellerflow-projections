-- Add statement_balance column to credit_cards table
ALTER TABLE public.credit_cards 
ADD COLUMN statement_balance numeric DEFAULT 0;

COMMENT ON COLUMN public.credit_cards.statement_balance IS 'Balance from the last billing statement';

-- Update existing records to set statement_balance equal to current balance as a starting point
UPDATE public.credit_cards 
SET statement_balance = balance 
WHERE statement_balance IS NULL OR statement_balance = 0;