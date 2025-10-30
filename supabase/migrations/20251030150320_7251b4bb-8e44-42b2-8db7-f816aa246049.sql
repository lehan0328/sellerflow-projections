-- Remove default priority from insert_secure_credit_card_simple function
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
  p_cash_back numeric DEFAULT 0,
  p_priority integer DEFAULT NULL  -- Changed from 3 to NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    cash_back,
    priority,
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
    p_access_token,
    p_plaid_item_id,
    p_minimum_payment,
    p_payment_due_date,
    p_statement_close_date,
    p_annual_fee,
    p_cash_back,
    p_priority,  -- Will be NULL if not provided
    NOW()
  ) RETURNING id INTO v_card_id;
  
  RETURN v_card_id;
END;
$function$;