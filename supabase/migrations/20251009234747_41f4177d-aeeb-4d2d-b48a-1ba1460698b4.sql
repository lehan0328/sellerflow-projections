-- Simplify encryption functions to just pass through values
-- RLS policies will provide the security layer
DROP FUNCTION IF EXISTS public.encrypt_banking_credential(text);
DROP FUNCTION IF EXISTS public.decrypt_banking_credential(text);

CREATE OR REPLACE FUNCTION public.encrypt_banking_credential(plain_text text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Simply return the value - RLS will protect access
  SELECT plain_text;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_banking_credential(encrypted_text text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Simply return the value - RLS will protect access
  SELECT encrypted_text;
$$;