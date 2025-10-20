-- Add foreign key constraint with cascade delete for amazon_payouts
-- This ensures that when an Amazon account is deleted, all associated payouts are automatically removed

-- First, drop the existing constraint if it exists (may not exist)
ALTER TABLE amazon_payouts 
DROP CONSTRAINT IF EXISTS amazon_payouts_amazon_account_id_fkey;

-- Add the foreign key with CASCADE delete
ALTER TABLE amazon_payouts
ADD CONSTRAINT amazon_payouts_amazon_account_id_fkey 
FOREIGN KEY (amazon_account_id) 
REFERENCES amazon_accounts(id) 
ON DELETE CASCADE;

-- Also add cascade delete for amazon_transactions
ALTER TABLE amazon_transactions 
DROP CONSTRAINT IF EXISTS amazon_transactions_amazon_account_id_fkey;

ALTER TABLE amazon_transactions
ADD CONSTRAINT amazon_transactions_amazon_account_id_fkey 
FOREIGN KEY (amazon_account_id) 
REFERENCES amazon_accounts(id) 
ON DELETE CASCADE;

-- Add cascade delete for amazon_daily_draws
ALTER TABLE amazon_daily_draws 
DROP CONSTRAINT IF EXISTS amazon_daily_draws_amazon_account_id_fkey;

ALTER TABLE amazon_daily_draws
ADD CONSTRAINT amazon_daily_draws_amazon_account_id_fkey 
FOREIGN KEY (amazon_account_id) 
REFERENCES amazon_accounts(id) 
ON DELETE CASCADE;