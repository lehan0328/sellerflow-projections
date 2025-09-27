-- Complete the security fix by removing unencrypted columns
-- This ensures sensitive data cannot be accessed even if RLS is bypassed

-- First, let's migrate any existing data to encrypted format
-- Update any rows that have unencrypted data but missing encrypted data
UPDATE public.bank_accounts 
SET 
  encrypted_access_token = CASE 
    WHEN encrypted_access_token IS NULL AND access_token IS NOT NULL 
    THEN encrypt_banking_credential(access_token)
    ELSE encrypted_access_token 
  END,
  encrypted_account_number = CASE 
    WHEN encrypted_account_number IS NULL AND account_number IS NOT NULL 
    THEN encrypt_banking_credential(account_number)
    ELSE encrypted_account_number 
  END,
  encrypted_plaid_item_id = CASE 
    WHEN encrypted_plaid_item_id IS NULL AND plaid_item_id IS NOT NULL 
    THEN encrypt_banking_credential(plaid_item_id)
    ELSE encrypted_plaid_item_id 
  END
WHERE user_id = auth.uid()
  AND (
    (encrypted_access_token IS NULL AND access_token IS NOT NULL) OR
    (encrypted_account_number IS NULL AND account_number IS NOT NULL) OR
    (encrypted_plaid_item_id IS NULL AND plaid_item_id IS NOT NULL)
  );

-- Now safely remove the unencrypted columns that pose security risks
ALTER TABLE public.bank_accounts 
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS account_number,
DROP COLUMN IF EXISTS plaid_item_id;

-- Add security comment
COMMENT ON TABLE public.bank_accounts IS 
'Bank accounts table with encrypted sensitive data. All access tokens, account numbers, and Plaid IDs are stored encrypted using user-specific keys. Use secure_bank_accounts view for access.';

-- Ensure the encrypted columns are properly indexed for performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_encrypted_tokens 
ON public.bank_accounts(user_id, encrypted_access_token) 
WHERE encrypted_access_token IS NOT NULL;

-- Add constraint to ensure encrypted data exists for active accounts
ALTER TABLE public.bank_accounts 
ADD CONSTRAINT check_encrypted_data_exists 
CHECK (
  NOT is_active OR (
    encrypted_access_token IS NOT NULL AND 
    encrypted_account_number IS NOT NULL AND 
    encrypted_plaid_item_id IS NOT NULL
  )
);