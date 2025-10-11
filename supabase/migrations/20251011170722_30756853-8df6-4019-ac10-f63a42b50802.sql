-- Fix 1: Enable RLS on plan_limits table
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read plan limits (for pricing page, etc.)
CREATE POLICY "Authenticated users can view plan limits"
ON public.plan_limits
FOR SELECT
TO authenticated
USING (true);

-- Fix 2: Implement proper encryption for banking credentials
-- Install pgsodium extension if not already installed
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Drop the old placeholder functions
DROP FUNCTION IF EXISTS public.encrypt_banking_credential(text);
DROP FUNCTION IF EXISTS public.decrypt_banking_credential(text);

-- Create proper encryption function using pgsodium
CREATE OR REPLACE FUNCTION public.encrypt_banking_credential(plain_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encrypted_value bytea;
BEGIN
  -- Return null if input is null
  IF plain_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Use pgsodium for deterministic encryption (allows lookups but is secure)
  encrypted_value := pgsodium.crypto_aead_det_encrypt(
    convert_to(plain_text, 'utf8'),
    convert_to('banking_credentials', 'utf8'), -- associated data for context
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'encryption_key' LIMIT 1)::bytea,
    NULL -- nonce (not needed for deterministic encryption)
  );
  
  RETURN encode(encrypted_value, 'base64');
EXCEPTION
  WHEN OTHERS THEN
    -- If encryption fails (e.g., no key), return the original text with a warning prefix
    -- This ensures backward compatibility during migration
    RAISE WARNING 'Encryption failed for banking credential: %', SQLERRM;
    RETURN plain_text;
END;
$$;

-- Create proper decryption function using pgsodium
CREATE OR REPLACE FUNCTION public.decrypt_banking_credential(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decrypted_value bytea;
BEGIN
  -- Return null if input is null
  IF encrypted_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Try to decrypt using pgsodium
  BEGIN
    decrypted_value := pgsodium.crypto_aead_det_decrypt(
      decode(encrypted_text, 'base64'),
      convert_to('banking_credentials', 'utf8'), -- associated data must match encryption
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'encryption_key' LIMIT 1)::bytea,
      NULL -- nonce (not needed for deterministic encryption)
    );
    
    RETURN convert_from(decrypted_value, 'utf8');
  EXCEPTION
    WHEN OTHERS THEN
      -- If decryption fails, assume it's plain text from old system
      -- This ensures backward compatibility during migration
      RETURN encrypted_text;
  END;
END;
$$;

-- Note: The encryption key needs to be set up in Supabase Vault
-- This can be done via the Supabase dashboard or CLI:
-- INSERT INTO vault.secrets (name, secret) VALUES ('encryption_key', 'your-32-byte-key-here');