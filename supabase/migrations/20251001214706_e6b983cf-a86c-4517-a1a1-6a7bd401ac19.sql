-- Add plaid_account_id column to bank_accounts table
ALTER TABLE public.bank_accounts
ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;