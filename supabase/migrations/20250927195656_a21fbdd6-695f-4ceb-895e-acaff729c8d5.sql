-- Fix encryption function to properly handle UUID to bytea conversion
CREATE OR REPLACE FUNCTION public.encrypt_banking_credential(plain_text text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
        decode(replace(auth.uid()::text, '-', ''), 'hex')  -- Convert UUID to bytea properly
      ), 
      'base64'
    )
  END;
END;
$function$;

-- Also fix the decryption function
CREATE OR REPLACE FUNCTION public.decrypt_banking_credential(encrypted_text text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Users can only decrypt their own data
  RETURN CASE 
    WHEN encrypted_text IS NULL OR encrypted_text = '' THEN NULL
    WHEN auth.uid() IS NULL THEN NULL  -- Must be authenticated
    ELSE convert_from(
      pgsodium.crypto_aead_det_decrypt(
        decode(encrypted_text, 'base64'),
        convert_to('banking_credentials_' || auth.uid()::text, 'utf8'),
        decode(replace(auth.uid()::text, '-', ''), 'hex')  -- Convert UUID to bytea properly
      ), 
      'utf8'
    )
  END;
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (corrupted data, wrong user, etc.)
    RETURN NULL;
END;
$function$;