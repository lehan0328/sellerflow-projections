-- Drop the old version of insert_secure_bank_account with 9 parameters
-- This resolves the function overloading conflict for bank accounts
DROP FUNCTION IF EXISTS public.insert_secure_bank_account(
  p_institution_name text,
  p_account_name text,
  p_account_type text,
  p_balance numeric,
  p_available_balance numeric,
  p_currency_code text,
  p_plaid_account_id text,
  p_access_token text,
  p_plaid_item_id text
);