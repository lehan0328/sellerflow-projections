-- Remove archived column from transactions table
ALTER TABLE public.transactions 
DROP COLUMN IF EXISTS archived;

-- Remove archived column from bank_transactions table
ALTER TABLE public.bank_transactions 
DROP COLUMN IF EXISTS archived;

-- Remove archived column from income table
ALTER TABLE public.income 
DROP COLUMN IF EXISTS archived;