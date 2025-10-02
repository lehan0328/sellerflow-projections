-- Drop the old version of insert_secure_credit_card with fewer parameters
-- This resolves the function overloading conflict
DROP FUNCTION IF EXISTS public.insert_secure_credit_card(
  p_institution_name text,
  p_account_name text,
  p_account_type text,
  p_balance numeric,
  p_credit_limit numeric,
  p_available_credit numeric,
  p_currency_code text,
  p_plaid_account_id text,
  p_access_token text,
  p_plaid_item_id text
);