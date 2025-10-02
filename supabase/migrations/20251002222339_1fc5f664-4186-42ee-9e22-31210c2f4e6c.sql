-- Drop old functions that have wrong encryption
DROP FUNCTION IF EXISTS insert_secure_credit_card(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS insert_secure_bank_account(TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT);

-- Recreate with correct encryption method
CREATE OR REPLACE FUNCTION insert_secure_credit_card(
  p_institution_name TEXT,
  p_account_name TEXT,
  p_account_type TEXT,
  p_balance NUMERIC,
  p_credit_limit NUMERIC,
  p_available_credit NUMERIC,
  p_currency_code TEXT,
  p_plaid_account_id TEXT,
  p_access_token TEXT,
  p_plaid_item_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_card_id UUID;
BEGIN
  -- Insert credit card with encrypted token using existing encryption function
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
    encrypt_banking_credential(p_access_token),
    encrypt_banking_credential(p_plaid_item_id),
    NOW()
  ) RETURNING id INTO v_card_id;
  
  RETURN v_card_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate bank account function with correct encryption
CREATE OR REPLACE FUNCTION insert_secure_bank_account(
  p_institution_name TEXT,
  p_account_name TEXT,
  p_account_type TEXT,
  p_balance NUMERIC,
  p_available_balance NUMERIC,
  p_currency_code TEXT,
  p_plaid_account_id TEXT,
  p_access_token TEXT,
  p_plaid_item_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Insert bank account with encrypted token using existing encryption function
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
    encrypt_banking_credential(p_access_token),
    encrypt_banking_credential(p_plaid_item_id),
    NOW()
  ) RETURNING id INTO v_account_id;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;