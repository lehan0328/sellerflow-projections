-- Create RPC function to securely insert credit card with encrypted Plaid credentials
CREATE OR REPLACE FUNCTION insert_secure_credit_card(
  p_institution_name TEXT,
  p_account_name TEXT,
  p_account_type TEXT,
  p_balance NUMERIC,
  p_credit_limit NUMERIC,
  p_available_credit NUMERIC,
  p_currency_code TEXT,
  p_plaid_account_id TEXT,
  p_plaid_access_token TEXT,
  p_plaid_item_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_card_id UUID;
  v_encrypted_token TEXT;
BEGIN
  -- Encrypt the access token
  v_encrypted_token := extensions.pgp_sym_encrypt(p_plaid_access_token, current_setting('app.settings.encryption_key'));
  
  -- Insert credit card with encrypted token
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
    plaid_access_token_encrypted,
    plaid_item_id,
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
    v_encrypted_token,
    p_plaid_item_id,
    NOW()
  ) RETURNING id INTO v_card_id;
  
  RETURN v_card_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to securely insert bank account with encrypted Plaid credentials
CREATE OR REPLACE FUNCTION insert_secure_bank_account(
  p_institution_name TEXT,
  p_account_name TEXT,
  p_account_type TEXT,
  p_account_id TEXT,
  p_balance NUMERIC,
  p_available_balance NUMERIC,
  p_currency_code TEXT,
  p_plaid_account_id TEXT,
  p_plaid_access_token TEXT,
  p_plaid_item_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
  v_encrypted_token TEXT;
BEGIN
  -- Encrypt the access token
  v_encrypted_token := extensions.pgp_sym_encrypt(p_plaid_access_token, current_setting('app.settings.encryption_key'));
  
  -- Insert bank account with encrypted token
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
    plaid_access_token_encrypted,
    plaid_item_id,
    last_sync
  ) VALUES (
    auth.uid(),
    p_institution_name,
    p_account_name,
    p_account_type,
    p_account_id,
    p_balance,
    p_available_balance,
    p_currency_code,
    p_plaid_account_id,
    v_encrypted_token,
    p_plaid_item_id,
    NOW()
  ) RETURNING id INTO v_account_id;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;