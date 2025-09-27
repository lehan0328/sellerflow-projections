-- Fix the dependency issue by dropping view first, then functions, then recreating everything
-- This will resolve the SECURITY DEFINER warnings

-- Step 1: Drop the view that depends on the functions
DROP VIEW IF EXISTS public.secure_bank_accounts;

-- Step 2: Drop the existing SECURITY DEFINER functions
DROP FUNCTION IF EXISTS encrypt_banking_credential(TEXT) CASCADE;
DROP FUNCTION IF EXISTS decrypt_banking_credential(TEXT) CASCADE;
DROP FUNCTION IF EXISTS insert_secure_bank_account CASCADE;
DROP FUNCTION IF EXISTS update_secure_bank_account CASCADE;

-- Step 3: Recreate encryption function without SECURITY DEFINER
CREATE OR REPLACE FUNCTION encrypt_banking_credential(plain_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  -- Use Supabase's built-in encryption with pgsodium
  -- Each user can only encrypt with their own key
  RETURN CASE 
    WHEN plain_text IS NULL OR plain_text = '' THEN NULL
    WHEN auth.uid() IS NULL THEN NULL  -- Must be authenticated
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

-- Step 4: Recreate decryption function without SECURITY DEFINER
CREATE OR REPLACE FUNCTION decrypt_banking_credential(encrypted_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  -- Users can only decrypt their own data
  RETURN CASE 
    WHEN encrypted_text IS NULL OR encrypted_text = '' THEN NULL
    WHEN auth.uid() IS NULL THEN NULL  -- Must be authenticated
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

-- Step 5: Recreate the secure view using the new functions
CREATE VIEW public.secure_bank_accounts AS
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

-- Step 6: Recreate insert function without SECURITY DEFINER
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

  -- Insert with encrypted sensitive data (RLS will enforce user_id automatically)
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

-- Step 7: Recreate update function without SECURITY DEFINER
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
SET search_path = public
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update with encryption for sensitive fields (RLS will enforce ownership)
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

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION encrypt_banking_credential TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_banking_credential TO authenticated;
GRANT EXECUTE ON FUNCTION insert_secure_bank_account TO authenticated;
GRANT EXECUTE ON FUNCTION update_secure_bank_account TO authenticated;
GRANT SELECT ON public.secure_bank_accounts TO authenticated;

-- Step 9: Add comments
COMMENT ON VIEW public.secure_bank_accounts IS 
'Secure view for bank accounts with automatic encryption/decryption. Regular view without SECURITY DEFINER.';

COMMENT ON FUNCTION encrypt_banking_credential IS 
'Encrypts banking credentials using user-specific keys. Regular function without SECURITY DEFINER.';

COMMENT ON FUNCTION decrypt_banking_credential IS 
'Decrypts banking credentials using user-specific keys. Regular function without SECURITY DEFINER.';

COMMENT ON FUNCTION insert_secure_bank_account IS 
'Secure function to insert bank accounts with automatic encryption. Regular function with RLS enforcement.';

COMMENT ON FUNCTION update_secure_bank_account IS 
'Secure function to update bank accounts with automatic encryption. Regular function with RLS enforcement.';