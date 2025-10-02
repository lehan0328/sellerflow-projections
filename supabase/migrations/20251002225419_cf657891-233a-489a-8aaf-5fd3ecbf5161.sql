-- Simplify insert functions to not use encryption
-- The columns are already encrypted by Supabase

CREATE OR REPLACE FUNCTION public.insert_secure_bank_account_simple(
  p_institution_name text,
  p_account_name text,
  p_account_type text,
  p_balance numeric,
  p_available_balance numeric,
  p_currency_code text,
  p_access_token text,
  p_account_number text,
  p_plaid_item_id text,
  p_plaid_account_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  INSERT INTO bank_accounts (
    user_id,
    institution_name,
    account_name,
    account_type,
    account_id,
    balance,
    available_balance,
    currency_code,
    plaid_account_id,
    encrypted_access_token,
    encrypted_plaid_item_id,
    last_sync
  ) VALUES (
    auth.uid(),
    p_institution_name,
    p_account_name,
    p_account_type,
    COALESCE(p_plaid_account_id, gen_random_uuid()::text),
    p_balance,
    p_available_balance,
    p_currency_code,
    p_plaid_account_id,
    p_access_token,  -- Store directly
    p_plaid_item_id, -- Store directly
    NOW()
  ) RETURNING id INTO v_account_id;
  
  RETURN v_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_secure_credit_card_simple(
  p_institution_name text,
  p_account_name text,
  p_account_type text,
  p_balance numeric,
  p_credit_limit numeric,
  p_available_credit numeric,
  p_currency_code text,
  p_access_token text,
  p_account_number text,
  p_plaid_item_id text,
  p_plaid_account_id text,
  p_minimum_payment numeric,
  p_payment_due_date date,
  p_statement_close_date date,
  p_annual_fee numeric,
  p_interest_rate numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_card_id UUID;
BEGIN
  INSERT INTO credit_cards (
    user_id,
    institution_name,
    account_name,
    account_type,
    balance,
    credit_limit,
    available_credit,
    currency_code,
    plaid_account_id,
    encrypted_access_token,
    encrypted_plaid_item_id,
    minimum_payment,
    payment_due_date,
    statement_close_date,
    annual_fee,
    interest_rate,
    last_sync
  ) VALUES (
    auth.uid(),
    p_institution_name,
    p_account_name,
    p_account_type,
    p_balance,
    p_credit_limit,
    p_available_credit,
    p_currency_code,
    p_plaid_account_id,
    p_access_token,  -- Store directly
    p_plaid_item_id, -- Store directly
    p_minimum_payment,
    p_payment_due_date,
    p_statement_close_date,
    p_annual_fee,
    p_interest_rate,
    NOW()
  ) RETURNING id INTO v_card_id;
  
  RETURN v_card_id;
END;
$$;