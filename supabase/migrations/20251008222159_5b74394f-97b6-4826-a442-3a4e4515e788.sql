-- Update the update_secure_credit_card function to accept statement_balance
CREATE OR REPLACE FUNCTION public.update_secure_credit_card(
  p_card_id uuid,
  p_institution_name text DEFAULT NULL::text,
  p_account_name text DEFAULT NULL::text,
  p_account_type text DEFAULT NULL::text,
  p_balance numeric DEFAULT NULL::numeric,
  p_statement_balance numeric DEFAULT NULL::numeric,
  p_credit_limit numeric DEFAULT NULL::numeric,
  p_available_credit numeric DEFAULT NULL::numeric,
  p_currency_code text DEFAULT NULL::text,
  p_access_token text DEFAULT NULL::text,
  p_account_number text DEFAULT NULL::text,
  p_plaid_item_id text DEFAULT NULL::text,
  p_plaid_account_id text DEFAULT NULL::text,
  p_minimum_payment numeric DEFAULT NULL::numeric,
  p_payment_due_date date DEFAULT NULL::date,
  p_statement_close_date date DEFAULT NULL::date,
  p_annual_fee numeric DEFAULT NULL::numeric,
  p_cash_back numeric DEFAULT NULL::numeric,
  p_priority integer DEFAULT NULL::integer
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update with encryption for sensitive fields (RLS will enforce ownership)
  UPDATE public.credit_cards SET
    institution_name = COALESCE(p_institution_name, institution_name),
    account_name = COALESCE(p_account_name, account_name),
    account_type = COALESCE(p_account_type, account_type),
    balance = COALESCE(p_balance, balance),
    statement_balance = COALESCE(p_statement_balance, statement_balance),
    credit_limit = COALESCE(p_credit_limit, credit_limit),
    available_credit = COALESCE(p_available_credit, available_credit),
    currency_code = COALESCE(p_currency_code, currency_code),
    encrypted_access_token = CASE 
      WHEN p_access_token IS NOT NULL THEN encrypt_banking_credential(p_access_token)
      ELSE encrypted_access_token 
    END,
    encrypted_account_number = CASE 
      WHEN p_account_number IS NOT NULL THEN encrypt_banking_credential(p_account_number)
      ELSE encrypted_account_number 
    END,
    encrypted_plaid_item_id = CASE 
      WHEN p_plaid_item_id IS NOT NULL THEN encrypt_banking_credential(p_plaid_item_id)
      ELSE encrypted_plaid_item_id 
    END,
    plaid_account_id = COALESCE(p_plaid_account_id, plaid_account_id),
    minimum_payment = COALESCE(p_minimum_payment, minimum_payment),
    payment_due_date = COALESCE(p_payment_due_date, payment_due_date),
    statement_close_date = COALESCE(p_statement_close_date, statement_close_date),
    annual_fee = COALESCE(p_annual_fee, annual_fee),
    cash_back = COALESCE(p_cash_back, cash_back),
    priority = COALESCE(p_priority, priority),
    updated_at = NOW()
  WHERE id = p_card_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$function$;