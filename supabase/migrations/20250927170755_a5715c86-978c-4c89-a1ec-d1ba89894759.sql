-- Create secure encryption functions for banking credentials (Fixed version)
-- This addresses the critical security vulnerability in banking data storage

-- Create a function to encrypt sensitive banking data using Supabase's built-in encryption
CREATE OR REPLACE FUNCTION encrypt_banking_credential(plain_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use Supabase's built-in encryption with pgsodium
  -- This encrypts the data using authenticated encryption
  RETURN CASE 
    WHEN plain_text IS NULL OR plain_text = '' THEN NULL
    ELSE encode(
      pgsodium.crypto_aead_det_encrypt(
        convert_to(plain_text, 'utf8'),
        convert_to('banking_credentials_' || auth.uid()::text, 'utf8'),
        auth.uid()::bytea
      ), 
      'base64'
    )
  END;
END;
$$;

-- Create a function to decrypt sensitive banking data
CREATE OR REPLACE FUNCTION decrypt_banking_credential(encrypted_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrypt the data using Supabase's built-in decryption
  RETURN CASE 
    WHEN encrypted_text IS NULL OR encrypted_text = '' THEN NULL
    ELSE convert_from(
      pgsodium.crypto_aead_det_decrypt(
        decode(encrypted_text, 'base64'),
        convert_to('banking_credentials_' || auth.uid()::text, 'utf8'),
        auth.uid()::bytea
      ), 
      'utf8'
    )
  END;
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (corrupted data, wrong user, etc.)
    RETURN NULL;
END;
$$;

-- Add encrypted columns to bank_accounts table
ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS encrypted_access_token TEXT,
ADD COLUMN IF NOT EXISTS encrypted_account_number TEXT,
ADD COLUMN IF NOT EXISTS encrypted_plaid_item_id TEXT;

-- Create secure view for bank accounts that automatically handles encryption/decryption
CREATE OR REPLACE VIEW public.secure_bank_accounts AS
SELECT 
  id,
  user_id,
  institution_name,
  account_name,
  account_type,
  balance,
  available_balance,
  currency_code,
  last_sync,
  is_active,
  created_at,
  updated_at,
  -- Only decrypt for the authenticated user who owns the data
  CASE 
    WHEN auth.uid() = user_id THEN decrypt_banking_credential(encrypted_access_token)
    ELSE NULL 
  END as access_token,
  CASE 
    WHEN auth.uid() = user_id THEN decrypt_banking_credential(encrypted_account_number)
    ELSE NULL 
  END as account_number,
  CASE 
    WHEN auth.uid() = user_id THEN decrypt_banking_credential(encrypted_plaid_item_id)
    ELSE NULL 
  END as plaid_item_id,
  -- Show masked version for display purposes
  CASE 
    WHEN auth.uid() = user_id AND encrypted_account_number IS NOT NULL 
    THEN '****' || RIGHT(decrypt_banking_credential(encrypted_account_number), 4)
    ELSE NULL 
  END as masked_account_number
FROM public.bank_accounts
WHERE auth.uid() = user_id;

-- Create secure insert function for bank accounts (all parameters have defaults)
CREATE OR REPLACE FUNCTION insert_secure_bank_account(
  p_institution_name TEXT DEFAULT NULL,
  p_account_name TEXT DEFAULT NULL,
  p_account_type TEXT DEFAULT NULL,
  p_balance NUMERIC DEFAULT 0,
  p_available_balance NUMERIC DEFAULT NULL,
  p_currency_code TEXT DEFAULT 'USD',
  p_access_token TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_plaid_item_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate required fields
  IF p_institution_name IS NULL OR p_account_name IS NULL OR p_account_type IS NULL THEN
    RAISE EXCEPTION 'Institution name, account name, and account type are required';
  END IF;

  -- Insert with encrypted sensitive data
  INSERT INTO public.bank_accounts (
    user_id,
    institution_name,
    account_name,
    account_type,
    balance,
    available_balance,
    currency_code,
    encrypted_access_token,
    encrypted_account_number,
    encrypted_plaid_item_id,
    last_sync
  ) VALUES (
    auth.uid(),
    p_institution_name,
    p_account_name,
    p_account_type,
    p_balance,
    p_available_balance,
    p_currency_code,
    encrypt_banking_credential(p_access_token),
    encrypt_banking_credential(p_account_number),
    encrypt_banking_credential(p_plaid_item_id),
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Create secure update function for bank accounts (all parameters have defaults)
CREATE OR REPLACE FUNCTION update_secure_bank_account(
  p_account_id UUID,
  p_institution_name TEXT DEFAULT NULL,
  p_account_name TEXT DEFAULT NULL,
  p_account_type TEXT DEFAULT NULL,
  p_balance NUMERIC DEFAULT NULL,
  p_available_balance NUMERIC DEFAULT NULL,
  p_currency_code TEXT DEFAULT NULL,
  p_access_token TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_plaid_item_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure user is authenticated and owns the account
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update with encryption for sensitive fields
  UPDATE public.bank_accounts SET
    institution_name = COALESCE(p_institution_name, institution_name),
    account_name = COALESCE(p_account_name, account_name),
    account_type = COALESCE(p_account_type, account_type),
    balance = COALESCE(p_balance, balance),
    available_balance = COALESCE(p_available_balance, available_balance),
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
    updated_at = NOW()
  WHERE id = p_account_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- Grant permissions to authenticated users for the secure functions
GRANT EXECUTE ON FUNCTION insert_secure_bank_account TO authenticated;
GRANT EXECUTE ON FUNCTION update_secure_bank_account TO authenticated;
GRANT SELECT ON public.secure_bank_accounts TO authenticated;

-- Create index on encrypted columns for performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_active 
ON public.bank_accounts(user_id, is_active) 
WHERE is_active = true;

-- Add comments explaining the security implementation
COMMENT ON VIEW public.secure_bank_accounts IS 
'Secure view for bank accounts that automatically encrypts/decrypts sensitive credentials. 
Only the account owner can decrypt their own data. Use this view for all banking operations.';

COMMENT ON FUNCTION insert_secure_bank_account IS 
'Secure function to insert bank accounts with automatic encryption of sensitive data.';

COMMENT ON FUNCTION update_secure_bank_account IS 
'Secure function to update bank accounts with automatic encryption of sensitive data.';