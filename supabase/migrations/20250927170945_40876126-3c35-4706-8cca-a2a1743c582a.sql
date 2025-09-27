-- Fix security linter issues from the previous migration

-- Drop the security definer view and recreate as a regular view
-- The view already has proper user filtering, so SECURITY DEFINER is not needed
DROP VIEW IF EXISTS public.secure_bank_accounts;

-- Recreate as a regular view with proper RLS enforcement
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

-- Grant select permissions on the view
GRANT SELECT ON public.secure_bank_accounts TO authenticated;

-- Update comment
COMMENT ON VIEW public.secure_bank_accounts IS 
'Secure view for bank accounts that automatically encrypts/decrypts sensitive credentials. 
Only the account owner can decrypt their own data. Use this view for all banking operations.
Uses regular view with user filtering instead of SECURITY DEFINER for better security.';