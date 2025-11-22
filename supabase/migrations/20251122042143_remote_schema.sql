


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'owner',
    'admin',
    'staff'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_referred_user_discount"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- When a referral is created, give the referred user a 10% discount
  IF NEW.status = 'trial' THEN
    -- Update the referred user's profile with a 10% discount
    UPDATE public.profiles
    SET plan_override = 'referred_user_discount'
    WHERE user_id = NEW.referred_user_id;
    
    -- Mark that discount was applied
    NEW.referred_user_discount_applied := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."apply_referred_user_discount"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_bank_account_balance"("account_id_param" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  initial_bal DECIMAL(12,2);
  initial_date TIMESTAMP WITH TIME ZONE;
  transaction_sum DECIMAL(12,2);
BEGIN
  -- Get initial balance and date
  SELECT initial_balance, initial_balance_date
  INTO initial_bal, initial_date
  FROM bank_accounts
  WHERE id = account_id_param;
  
  -- If no initial balance set, return current balance
  IF initial_bal IS NULL THEN
    SELECT balance INTO initial_bal
    FROM bank_accounts
    WHERE id = account_id_param;
    RETURN initial_bal;
  END IF;
  
  -- Sum all transactions since initial date
  -- Negative amounts are debits (money out), positive are credits (money in)
  SELECT COALESCE(SUM(-amount), 0)
  INTO transaction_sum
  FROM bank_transactions
  WHERE bank_account_id = account_id_param
    AND archived = false
    AND date >= initial_date;
  
  RETURN initial_bal + transaction_sum;
END;
$$;


ALTER FUNCTION "public"."calculate_bank_account_balance"("account_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_credit_card_balance"("card_id_param" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  initial_bal DECIMAL(12,2);
  initial_date TIMESTAMP WITH TIME ZONE;
  transaction_sum DECIMAL(12,2);
BEGIN
  -- Get initial balance and date
  SELECT initial_balance, initial_balance_date
  INTO initial_bal, initial_date
  FROM credit_cards
  WHERE id = card_id_param;
  
  -- If no initial balance set, return current balance
  IF initial_bal IS NULL THEN
    SELECT balance INTO initial_bal
    FROM credit_cards
    WHERE id = card_id_param;
    RETURN initial_bal;
  END IF;
  
  -- Sum all transactions since initial date for this credit card
  -- Credit card transactions are debits (charges increase balance)
  SELECT COALESCE(SUM(amount), 0)
  INTO transaction_sum
  FROM transactions
  WHERE credit_card_id = card_id_param
    AND archived = false
    AND payment_date >= initial_date;
  
  RETURN initial_bal + transaction_sum;
END;
$$;


ALTER FUNCTION "public"."calculate_credit_card_balance"("card_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_admin_permission"("user_email" "text") RETURNS TABLE("has_permission" boolean, "role" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    true as has_permission,
    ap.role
  FROM admin_permissions ap
  WHERE ap.email = user_email
    AND ap.account_created = true
  LIMIT 1;
$$;


ALTER FUNCTION "public"."check_admin_permission"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_data_consistency"("p_user_id" "uuid") RETURNS TABLE("table_name" "text", "total_records" bigint, "missing_account_id" bigint, "account_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Get user's account_id
  SELECT account_id INTO v_account_id
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  -- Check recurring_expenses
  RETURN QUERY
  SELECT 
    'recurring_expenses'::TEXT,
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE re.account_id IS NULL)::BIGINT as missing,
    v_account_id
  FROM public.recurring_expenses re
  WHERE re.user_id = p_user_id;
  
  -- Check transactions
  RETURN QUERY
  SELECT 
    'transactions'::TEXT,
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE t.account_id IS NULL)::BIGINT as missing,
    v_account_id
  FROM public.transactions t
  WHERE t.user_id = p_user_id;
  
  -- Check vendors
  RETURN QUERY
  SELECT 
    'vendors'::TEXT,
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE v.account_id IS NULL)::BIGINT as missing,
    v_account_id
  FROM public.vendors v
  WHERE v.user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."check_user_data_consistency"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_reset_tokens"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.password_reset_tokens 
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_reset_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_bank_transactions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cutoff_date DATE;
  v_deleted_count INTEGER;
BEGIN
  -- Calculate cutoff date (60 days ago, not 45)
  v_cutoff_date := CURRENT_DATE - INTERVAL '60 days';
  
  -- Delete archived bank transactions older than 60 days
  WITH deleted AS (
    DELETE FROM bank_transactions
    WHERE date < v_cutoff_date
    AND archived = true
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RAISE NOTICE 'Deleted % archived bank transactions older than %', v_deleted_count, v_cutoff_date;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_bank_transactions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_income"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cutoff_date DATE;
  v_deleted_count INTEGER;
BEGIN
  -- Calculate cutoff date (60 days ago)
  v_cutoff_date := CURRENT_DATE - INTERVAL '60 days';
  
  -- Delete archived income records older than 60 days
  WITH deleted AS (
    DELETE FROM income
    WHERE payment_date < v_cutoff_date
    AND archived = true
    AND status = 'received'
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RAISE NOTICE 'Deleted % archived income records older than %', v_deleted_count, v_cutoff_date;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_income"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_transactions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cutoff_date DATE;
  v_deleted_count INTEGER;
BEGIN
  -- Calculate cutoff date (60 days ago)
  v_cutoff_date := CURRENT_DATE - INTERVAL '60 days';
  
  -- Delete archived transactions older than 60 days
  WITH deleted AS (
    DELETE FROM transactions
    WHERE (due_date < v_cutoff_date OR transaction_date < v_cutoff_date)
    AND archived = true
    AND status = 'completed'
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RAISE NOTICE 'Deleted % archived transactions older than %', v_deleted_count, v_cutoff_date;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_transactions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_user_documents"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_account_id UUID;
  v_file_record RECORD;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get user's account_id
  SELECT account_id INTO v_account_id
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'User account not found';
  END IF;
  
  -- Delete all files from storage bucket for this account
  FOR v_file_record IN 
    SELECT file_path 
    FROM documents_metadata 
    WHERE account_id = v_account_id
  LOOP
    PERFORM storage.delete_object('purchase-orders', v_file_record.file_path);
  END LOOP;
  
  -- Delete all metadata records (this will cascade to line items automatically)
  DELETE FROM documents_metadata WHERE account_id = v_account_id;
END;
$$;


ALTER FUNCTION "public"."clear_user_documents"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_categories"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Insert default expense categories (non-recurring)
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Utilities', 'expense', true, false),
    (NEW.user_id, NEW.account_id, 'Shipping', 'expense', true, false)
  ON CONFLICT DO NOTHING;
  
  -- Insert default purchase order categories
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Inventory', 'purchase_order', true, false),
    (NEW.user_id, NEW.account_id, 'Equipment', 'purchase_order', true, false),
    (NEW.user_id, NEW.account_id, 'Supplies', 'purchase_order', true, false)
  ON CONFLICT DO NOTHING;

  -- Insert default income categories (non-recurring)
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Sales', 'income', true, false),
    (NEW.user_id, NEW.account_id, 'Services', 'income', true, false)
  ON CONFLICT DO NOTHING;

  -- Insert default recurring expense categories (removed Payroll)
  INSERT INTO public.categories (user_id, account_id, name, type, is_default, is_recurring)
  VALUES
    (NEW.user_id, NEW.account_id, 'Software', 'expense', true, true),
    (NEW.user_id, NEW.account_id, 'Loan', 'expense', true, true)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_categories"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_banking_credential"("encrypted_text" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."decrypt_banking_credential"("encrypted_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_banking_credential"("plain_text" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."encrypt_banking_credential"("plain_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_admin_permissions"() RETURNS TABLE("id" "uuid", "email" "text", "role" "text", "invited_by" "text", "invited_at" timestamp with time zone, "account_created" boolean, "first_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    ap.id,
    ap.email,
    ap.role,
    ap.invited_by,
    ap.invited_at,
    ap.account_created,
    ap.first_name
  FROM admin_permissions ap
  ORDER BY ap.invited_at DESC;
$$;


ALTER FUNCTION "public"."get_all_admin_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_amazon_revenue_30_days"("p_user_id" "uuid") RETURNS numeric
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM amazon_transactions
  WHERE user_id = p_user_id
    AND transaction_type = 'Order'
    AND amount > 0
    AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
    AND transaction_date <= CURRENT_DATE;
$$;


ALTER FUNCTION "public"."get_amazon_revenue_30_days"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_account_id"("_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT account_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_account_id"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_plan_limits"("p_user_id" "uuid") RETURNS TABLE("plan_name" "text", "bank_connections" integer, "amazon_connections" integer, "team_members" integer, "has_ai_insights" boolean, "has_ai_pdf_extractor" boolean, "has_automated_notifications" boolean, "has_scenario_planning" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_plan_override TEXT;
  v_trial_end TIMESTAMP WITH TIME ZONE;
  v_plan_name TEXT;
BEGIN
  -- Get user's plan override and trial status
  SELECT p.plan_override, p.trial_end INTO v_plan_override, v_trial_end
  FROM profiles p
  WHERE p.user_id = p_user_id;

  -- Determine plan name
  IF v_trial_end IS NOT NULL AND v_trial_end > NOW() THEN
    -- User is in trial, use professional plan limits
    v_plan_name := 'professional';
  ELSIF v_plan_override IS NOT NULL THEN
    -- Extract plan name from override (e.g., 'professional', 'starter', etc.)
    v_plan_name := v_plan_override;
  ELSE
    -- Default to starter plan
    v_plan_name := 'starter';
  END IF;

  -- Return plan limits
  RETURN QUERY
  SELECT 
    pl.plan_name,
    pl.bank_connections,
    pl.amazon_connections,
    pl.team_members,
    pl.has_ai_insights,
    pl.has_ai_pdf_extractor,
    pl.has_automated_notifications,
    pl.has_scenario_planning
  FROM plan_limits pl
  WHERE pl.plan_name = v_plan_name;
END;
$$;


ALTER FUNCTION "public"."get_user_plan_limits"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_affiliate_churn"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_affiliate_id UUID;
BEGIN
  -- Only process if status changed from 'active' to 'churned'
  IF OLD.status = 'active' AND NEW.status = 'churned' THEN
    v_affiliate_id := NEW.affiliate_id;
    
    -- Deduct commission for churned customer
    -- You might want to track how much commission was already paid for this referral
    -- and adjust pending_commission accordingly
    UPDATE affiliates
    SET 
      pending_commission = GREATEST(0, pending_commission - COALESCE(NEW.commission_amount, 0)),
      updated_at = NOW()
    WHERE id = v_affiliate_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_affiliate_churn"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    email,
    company,
    monthly_amazon_revenue,
    hear_about_us,
    referral_code,
    trial_start,
    trial_end,
    plan_tier
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    NEW.raw_user_meta_data ->> 'company',
    NEW.raw_user_meta_data ->> 'monthly_amazon_revenue',
    NEW.raw_user_meta_data ->> 'hear_about_us',
    NEW.raw_user_meta_data ->> 'referral_code',
    now(),
    now() + interval '168 hours',
    'professional'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Create owner role using the account_id from the NEW profile record
  IF NEW.account_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, account_id, role)
    VALUES (NEW.user_id, NEW.account_id, 'owner'::app_role)
    ON CONFLICT (user_id, account_id) WHERE account_id IS NOT NULL DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_admin_role"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  )
$$;


ALTER FUNCTION "public"."has_admin_role"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_account_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND account_id = _account_id
      AND role = _role
  );
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_account_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_affiliate_commission"("p_affiliate_id" "uuid", "p_commission_amount" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE affiliates
  SET 
    pending_commission = pending_commission + p_commission_amount,
    total_commission_earned = total_commission_earned + p_commission_amount,
    paid_referrals = paid_referrals + 1,
    trial_referrals = GREATEST(0, trial_referrals - 1),
    updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$$;


ALTER FUNCTION "public"."increment_affiliate_commission"("p_affiliate_id" "uuid", "p_commission_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_referral_code_usage"("p_code" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE referral_codes
  SET 
    current_uses = current_uses + 1,
    last_used_at = NOW()
  WHERE code = p_code;
END;
$$;


ALTER FUNCTION "public"."increment_referral_code_usage"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_secure_amazon_account"("p_seller_id" "text", "p_marketplace_id" "text", "p_marketplace_name" "text", "p_account_name" "text", "p_refresh_token" "text" DEFAULT NULL::"text", "p_access_token" "text" DEFAULT NULL::"text", "p_client_id" "text" DEFAULT NULL::"text", "p_client_secret" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate required fields
  IF p_seller_id IS NULL OR p_marketplace_id IS NULL OR p_marketplace_name IS NULL OR p_account_name IS NULL THEN
    RAISE EXCEPTION 'Seller ID, marketplace ID, marketplace name, and account name are required';
  END IF;

  -- Insert with encrypted sensitive data
  INSERT INTO public.amazon_accounts (
    user_id,
    seller_id,
    marketplace_id,
    marketplace_name,
    account_name,
    encrypted_refresh_token,
    encrypted_access_token,
    encrypted_client_id,
    encrypted_client_secret,
    last_sync
  ) VALUES (
    auth.uid(),
    p_seller_id,
    p_marketplace_id,
    p_marketplace_name,
    p_account_name,
    encrypt_banking_credential(p_refresh_token),
    encrypt_banking_credential(p_access_token),
    encrypt_banking_credential(p_client_id),
    encrypt_banking_credential(p_client_secret),
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;


ALTER FUNCTION "public"."insert_secure_amazon_account"("p_seller_id" "text", "p_marketplace_id" "text", "p_marketplace_name" "text", "p_account_name" "text", "p_refresh_token" "text", "p_access_token" "text", "p_client_id" "text", "p_client_secret" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_secure_bank_account"("p_institution_name" "text" DEFAULT NULL::"text", "p_account_name" "text" DEFAULT NULL::"text", "p_account_type" "text" DEFAULT NULL::"text", "p_balance" numeric DEFAULT 0, "p_available_balance" numeric DEFAULT NULL::numeric, "p_currency_code" "text" DEFAULT 'USD'::"text", "p_access_token" "text" DEFAULT NULL::"text", "p_account_number" "text" DEFAULT NULL::"text", "p_plaid_item_id" "text" DEFAULT NULL::"text", "p_plaid_account_id" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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
    plaid_account_id,
    account_id,
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
    p_plaid_account_id,
    COALESCE(p_plaid_account_id, gen_random_uuid()::text),
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;


ALTER FUNCTION "public"."insert_secure_bank_account"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_secure_bank_account_simple"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_account_id UUID;
BEGIN
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
    p_access_token,  -- Store directly
    p_plaid_item_id, -- Store directly
    NOW()
  ) RETURNING id INTO v_account_id;
  
  RETURN v_account_id;
END;
$$;


ALTER FUNCTION "public"."insert_secure_bank_account_simple"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_secure_credit_card"("p_institution_name" "text" DEFAULT NULL::"text", "p_account_name" "text" DEFAULT NULL::"text", "p_account_type" "text" DEFAULT 'credit'::"text", "p_balance" numeric DEFAULT 0, "p_credit_limit" numeric DEFAULT 0, "p_available_credit" numeric DEFAULT NULL::numeric, "p_currency_code" "text" DEFAULT 'USD'::"text", "p_access_token" "text" DEFAULT NULL::"text", "p_account_number" "text" DEFAULT NULL::"text", "p_plaid_item_id" "text" DEFAULT NULL::"text", "p_plaid_account_id" "text" DEFAULT NULL::"text", "p_minimum_payment" numeric DEFAULT 0, "p_payment_due_date" "date" DEFAULT NULL::"date", "p_statement_close_date" "date" DEFAULT NULL::"date", "p_annual_fee" numeric DEFAULT 0, "p_interest_rate" numeric DEFAULT 0) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate required fields
  IF p_institution_name IS NULL OR p_account_name IS NULL THEN
    RAISE EXCEPTION 'Institution name and account name are required';
  END IF;

  -- Calculate available credit if not provided
  IF p_available_credit IS NULL THEN
    p_available_credit := p_credit_limit - p_balance;
  END IF;

  -- Insert with encrypted sensitive data
  INSERT INTO public.credit_cards (
    user_id,
    institution_name,
    account_name,
    account_type,
    balance,
    credit_limit,
    available_credit,
    currency_code,
    encrypted_access_token,
    encrypted_account_number,
    encrypted_plaid_item_id,
    plaid_account_id,
    minimum_payment,
    payment_due_date,
    statement_close_date,
    annual_fee,
    interest_rate,
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
    encrypt_banking_credential(p_access_token),
    encrypt_banking_credential(p_account_number),
    encrypt_banking_credential(p_plaid_item_id),
    p_plaid_account_id,
    p_minimum_payment,
    p_payment_due_date,
    p_statement_close_date,
    p_annual_fee,
    p_interest_rate,
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;


ALTER FUNCTION "public"."insert_secure_credit_card"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_interest_rate" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_secure_credit_card_simple"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric DEFAULT 0, "p_priority" integer DEFAULT NULL::integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_card_id UUID;
BEGIN
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
    minimum_payment,
    payment_due_date,
    statement_close_date,
    annual_fee,
    cash_back,
    priority,
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
    p_access_token,
    p_plaid_item_id,
    p_minimum_payment,
    p_payment_due_date,
    p_statement_close_date,
    p_annual_fee,
    p_cash_back,
    p_priority,  -- Will be NULL if not provided
    NOW()
  ) RETURNING id INTO v_card_id;
  
  RETURN v_card_id;
END;
$$;


ALTER FUNCTION "public"."insert_secure_credit_card_simple"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric, "p_priority" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_account_admin"("_user_id" "uuid", "_account_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND account_id = _account_id
      AND role IN ('owner', 'admin')
  );
$$;


ALTER FUNCTION "public"."is_account_admin"("_user_id" "uuid", "_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT is_website_admin()
  OR EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE admin_permissions.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND admin_permissions.account_created = true
  )
$$;


ALTER FUNCTION "public"."is_admin_staff"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin_staff"() IS 'Checks if user is admin staff (website admin or has admin_permissions)';



CREATE OR REPLACE FUNCTION "public"."is_website_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND account_id IS NULL
      AND role = 'admin'::app_role
  )
$$;


ALTER FUNCTION "public"."is_website_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_website_admin"() IS 'Checks if user is a website-level admin (account_id IS NULL in user_roles)';



CREATE OR REPLACE FUNCTION "public"."log_duplicate_amazon_attempt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_existing_email TEXT;
  v_attempting_email TEXT;
BEGIN
  -- Only trigger on duplicate attempts (when validation would fail)
  IF NEW.is_active = true THEN
    -- Check if there's an existing active connection
    SELECT au.email INTO v_existing_email
    FROM amazon_accounts aa
    JOIN auth.users au ON au.id = aa.user_id
    WHERE aa.seller_id = NEW.seller_id 
      AND aa.is_active = true
      AND aa.id != NEW.id
    LIMIT 1;
    
    IF v_existing_email IS NOT NULL THEN
      -- Get attempting user's email
      SELECT email INTO v_attempting_email
      FROM auth.users
      WHERE id = NEW.user_id;
      
      -- Create support ticket for investigation
      INSERT INTO support_tickets (
        user_id, subject, message, category, priority, status
      ) VALUES (
        NEW.user_id,
        'Duplicate Amazon Seller Connection Attempt',
        format('User %s attempted to connect Amazon Seller ID %s which is already connected to account %s. This requires investigation to determine rightful ownership.', 
          v_attempting_email, NEW.seller_id, v_existing_email),
        'Security Alert',
        'high',
        'open'
      );
      
      -- Log in audit table
      INSERT INTO amazon_connection_audit (
        seller_id, previous_user_id, new_user_id, action, reason, performed_by
      ) VALUES (
        NEW.seller_id, 
        (SELECT user_id FROM amazon_accounts WHERE seller_id = NEW.seller_id AND is_active = true AND id != NEW.id LIMIT 1),
        NEW.user_id,
        'blocked_duplicate',
        'Duplicate seller_id connection attempt',
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_duplicate_amazon_attempt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_recurring_expense_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Log when recurring expenses are queried with potential RLS issues
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      table_name,
      operation,
      user_id,
      record_id,
      metadata
    ) VALUES (
      'recurring_expenses',
      TG_OP,
      auth.uid(),
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
      END,
      jsonb_build_object(
        'account_id', CASE 
          WHEN TG_OP = 'DELETE' THEN OLD.account_id
          ELSE NEW.account_id
        END,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$;


ALTER FUNCTION "public"."log_recurring_expense_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_customer_on_staff_response"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Function kept for compatibility but no longer sends notifications
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_customer_on_staff_response"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_customer_on_ticket_closed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Function kept for compatibility but no longer sends notifications
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_customer_on_ticket_closed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_unauthorized_account_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Prevent changing account_id unless user is admin
  IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
    IF NOT is_website_admin() THEN
      RAISE EXCEPTION 'Unauthorized account_id modification. Contact support at support@auren.app';
    END IF;
    
    -- Log the change
    INSERT INTO account_modification_audit (
      table_name, record_id, old_account_id, new_account_id, 
      modified_by, modified_at
    ) VALUES (
      TG_TABLE_NAME, NEW.id, OLD.account_id, NEW.account_id,
      auth.uid(), NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_unauthorized_account_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_account_id_from_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.account_id IS NULL THEN
    NEW.account_id := (SELECT account_id FROM profiles WHERE user_id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_account_id_from_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_id_with_account"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If account_id is set, ensure user_id matches an owner of that account
  IF NEW.account_id IS NOT NULL THEN
    -- Get the account owner's user_id
    SELECT user_id INTO NEW.user_id
    FROM profiles
    WHERE account_id = NEW.account_id
    AND is_account_owner = true
    LIMIT 1;
    
    -- If no owner found, use the current user_id but log a warning
    IF NEW.user_id IS NULL THEN
      RAISE WARNING 'No account owner found for account_id %, keeping user_id %', NEW.account_id, NEW.user_id;
      -- Keep the existing user_id instead of setting to null
      NEW.user_id := COALESCE(NEW.user_id, auth.uid());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_id_with_account"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_user_id_with_account"() IS 'Automatically syncs user_id to match the account owner when account_id is set or changed. Prevents user_id/account_id mismatches.';



CREATE OR REPLACE FUNCTION "public"."track_affiliate_referral"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_affiliate_id UUID;
  v_affiliate_code TEXT;
BEGIN
  -- Extract affiliate_code from user metadata
  SELECT (NEW.raw_user_meta_data->>'affiliate_code') INTO v_affiliate_code;
  
  -- Only proceed if affiliate_code exists
  IF v_affiliate_code IS NOT NULL THEN
    -- Validate affiliate code exists and is approved
    SELECT id INTO v_affiliate_id
    FROM affiliates
    WHERE affiliate_code = v_affiliate_code
      AND status = 'approved'
    LIMIT 1;
    
    -- If valid affiliate found, create referral record
    IF v_affiliate_id IS NOT NULL THEN
      INSERT INTO affiliate_referrals (
        affiliate_id,
        referred_user_id,
        status
      ) VALUES (
        v_affiliate_id,
        NEW.id,
        'trial'
      );
      
      -- Update affiliate metrics
      UPDATE affiliates
      SET 
        trial_referrals = trial_referrals + 1,
        total_referrals = total_referrals + 1,
        updated_at = NOW()
      WHERE id = v_affiliate_id;
      
      RAISE NOTICE 'Created affiliate referral for user % with affiliate %', NEW.id, v_affiliate_id;
    ELSE
      RAISE NOTICE 'Affiliate code % not found or not approved', v_affiliate_code;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."track_affiliate_referral"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_affiliate_commission_rate"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Set commission rate based on tier
  -- starter: 15%, growth: 20%, pro: 25%, elite: 30%, god: 35%
  CASE NEW.tier
    WHEN 'god' THEN NEW.commission_rate := 35;
    WHEN 'elite' THEN NEW.commission_rate := 30;
    WHEN 'pro' THEN NEW.commission_rate := 25;
    WHEN 'growth' THEN NEW.commission_rate := 20;
    ELSE NEW.commission_rate := 15;
  END CASE;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_affiliate_commission_rate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_affiliate_tier"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_trial_count INTEGER;
  v_paid_count INTEGER;
  v_churned_count INTEGER;
  v_total_count INTEGER;
  v_new_tier TEXT;
BEGIN
  -- Count trial referrals (status = 'trial')
  SELECT COUNT(*) INTO v_trial_count
  FROM affiliate_referrals
  WHERE affiliate_id = NEW.affiliate_id AND status = 'trial';
  
  -- Count paid referrals (status = 'active')
  SELECT COUNT(*) INTO v_paid_count
  FROM affiliate_referrals
  WHERE affiliate_id = NEW.affiliate_id AND status = 'active';
  
  -- Count churned referrals (status = 'churned')
  SELECT COUNT(*) INTO v_churned_count
  FROM affiliate_referrals
  WHERE affiliate_id = NEW.affiliate_id AND status = 'churned';
  
  -- Total count (excluding churned)
  v_total_count := v_trial_count + v_paid_count;
  
  -- Determine tier based on PAID referral count only (churned not counted)
  -- starter: 0-10 (15%), growth: 11-30 (20%), pro: 31-50 (25%), elite: 51-100 (30%), god: 100+ (35%)
  CASE
    WHEN v_paid_count >= 100 THEN v_new_tier := 'god';
    WHEN v_paid_count >= 51 THEN v_new_tier := 'elite';
    WHEN v_paid_count >= 31 THEN v_new_tier := 'pro';
    WHEN v_paid_count >= 11 THEN v_new_tier := 'growth';
    ELSE v_new_tier := 'starter';
  END CASE;
  
  -- Update the affiliate's tier and referral counts
  UPDATE affiliates
  SET 
    tier = v_new_tier,
    trial_referrals = v_trial_count,
    paid_referrals = v_paid_count,
    churned_referrals = v_churned_count,
    total_referrals = v_total_count,
    updated_at = NOW()
  WHERE id = NEW.affiliate_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_affiliate_tier"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_amazon_daily_draws_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_amazon_daily_draws_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_bank_account_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE bank_accounts
  SET 
    balance = calculate_bank_account_balance(NEW.bank_account_id),
    updated_at = NOW()
  WHERE id = NEW.bank_account_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_bank_account_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_bank_accounts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_bank_accounts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_bank_balance_on_transaction_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update bank account balance
  IF TG_OP = 'DELETE' THEN
    UPDATE bank_accounts
    SET 
      balance = calculate_bank_account_balance(OLD.bank_account_id),
      available_balance = calculate_bank_account_balance(OLD.bank_account_id),
      updated_at = NOW()
    WHERE id = OLD.bank_account_id;
    RETURN OLD;
  ELSE
    UPDATE bank_accounts
    SET 
      balance = calculate_bank_account_balance(NEW.bank_account_id),
      available_balance = calculate_bank_account_balance(NEW.bank_account_id),
      updated_at = NOW()
    WHERE id = NEW.bank_account_id;
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_bank_balance_on_transaction_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_credit_card_balance_on_transaction_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update credit card balance
  IF TG_OP = 'DELETE' THEN
    UPDATE credit_cards
    SET 
      balance = calculate_credit_card_balance(OLD.credit_card_id),
      available_credit = credit_limit - calculate_credit_card_balance(OLD.credit_card_id),
      updated_at = NOW()
    WHERE id = OLD.credit_card_id;
    RETURN OLD;
  ELSE
    UPDATE credit_cards
    SET 
      balance = calculate_credit_card_balance(NEW.credit_card_id),
      available_credit = credit_limit - calculate_credit_card_balance(NEW.credit_card_id),
      updated_at = NOW()
    WHERE id = NEW.credit_card_id;
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_credit_card_balance_on_transaction_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_notification_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notification_preferences_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_purchase_order_line_items_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_purchase_order_line_items_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_referral_rewards"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_referrer_id UUID;
  v_current_count INTEGER;
  v_new_tier INTEGER;
  v_discount_pct INTEGER;
  v_cash_bonus NUMERIC;
  v_duration_months INTEGER;
  v_old_tier INTEGER;
BEGIN
  -- Only process when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    v_referrer_id := NEW.referrer_id;
    
    -- Get current active referral count
    SELECT COUNT(*) INTO v_current_count
    FROM referrals
    WHERE referrer_id = v_referrer_id AND status = 'active';
    
    -- Determine tier based on count
    -- Tiers: 1, 2, 5, 10, 20, 50, 100
    CASE
      WHEN v_current_count >= 100 THEN 
        v_new_tier := 7;
        v_discount_pct := 0; -- 6 months free
        v_cash_bonus := 2000; -- Updated from 3000 to 2000
        v_duration_months := 6;
      WHEN v_current_count >= 50 THEN 
        v_new_tier := 6;
        v_discount_pct := 50;
        v_cash_bonus := 1000;
        v_duration_months := 3;
      WHEN v_current_count >= 20 THEN 
        v_new_tier := 5;
        v_discount_pct := 40;
        v_cash_bonus := 200;
        v_duration_months := 3;
      WHEN v_current_count >= 10 THEN 
        v_new_tier := 4;
        v_discount_pct := 30;
        v_cash_bonus := 100;
        v_duration_months := 3;
      WHEN v_current_count >= 5 THEN 
        v_new_tier := 3;
        v_discount_pct := 25;
        v_cash_bonus := 50;
        v_duration_months := 3;
      WHEN v_current_count >= 2 THEN 
        v_new_tier := 2;
        v_discount_pct := 20;
        v_cash_bonus := 0;
        v_duration_months := 3;
      WHEN v_current_count >= 1 THEN 
        v_new_tier := 1;
        v_discount_pct := 15;
        v_cash_bonus := 0;
        v_duration_months := 3;
      ELSE
        v_new_tier := 0;
        v_discount_pct := 0;
        v_cash_bonus := 0;
        v_duration_months := 0;
    END CASE;
    
    -- Get old tier
    SELECT COALESCE(tier_level, 0) INTO v_old_tier
    FROM referral_rewards
    WHERE user_id = v_referrer_id;
    
    -- Update or insert referral_rewards
    INSERT INTO referral_rewards (
      user_id,
      referral_count,
      tier_level,
      discount_percentage,
      cash_bonus,
      pending_cash_bonus,
      discount_start_date,
      discount_end_date,
      total_cash_earned,
      reward_status
    ) VALUES (
      v_referrer_id,
      v_current_count,
      v_new_tier,
      v_discount_pct,
      v_cash_bonus,
      v_cash_bonus,
      NOW(),
      NOW() + (v_duration_months || ' months')::INTERVAL,
      v_cash_bonus,
      'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      referral_count = v_current_count,
      tier_level = v_new_tier,
      discount_percentage = v_discount_pct,
      cash_bonus = v_cash_bonus,
      pending_cash_bonus = CASE 
        WHEN v_new_tier > v_old_tier AND v_cash_bonus > 0 
        THEN referral_rewards.pending_cash_bonus + v_cash_bonus
        ELSE referral_rewards.pending_cash_bonus
      END,
      discount_start_date = NOW(),
      discount_end_date = NOW() + (v_duration_months || ' months')::INTERVAL,
      total_cash_earned = referral_rewards.total_cash_earned + v_cash_bonus,
      reward_status = 'active',
      updated_at = NOW();
    
    -- Create support ticket for cash bonus redemption if tier increased and has cash bonus
    IF v_new_tier > v_old_tier AND v_cash_bonus > 0 THEN
      INSERT INTO support_tickets (
        user_id,
        subject,
        message,
        category,
        status,
        priority
      ) VALUES (
        v_referrer_id,
        'Referral Cash Bonus Redemption - Tier ' || v_new_tier,
        'Congratulations! You have reached ' || v_current_count || ' referrals and earned a $' || v_cash_bonus || ' cash bonus. Please provide your payment details to redeem this reward.',
        'Referral Rewards',
        'open',
        'high'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."update_referral_rewards"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_secure_amazon_account"("p_account_id" "uuid", "p_account_name" "text" DEFAULT NULL::"text", "p_refresh_token" "text" DEFAULT NULL::"text", "p_access_token" "text" DEFAULT NULL::"text", "p_client_id" "text" DEFAULT NULL::"text", "p_client_secret" "text" DEFAULT NULL::"text", "p_token_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update with encryption for sensitive fields (RLS will enforce ownership)
  UPDATE public.amazon_accounts SET
    account_name = COALESCE(p_account_name, account_name),
    encrypted_refresh_token = CASE 
      WHEN p_refresh_token IS NOT NULL THEN encrypt_banking_credential(p_refresh_token)
      ELSE encrypted_refresh_token 
    END,
    encrypted_access_token = CASE 
      WHEN p_access_token IS NOT NULL THEN encrypt_banking_credential(p_access_token)
      ELSE encrypted_access_token 
    END,
    encrypted_client_id = CASE 
      WHEN p_client_id IS NOT NULL THEN encrypt_banking_credential(p_client_id)
      ELSE encrypted_client_id 
    END,
    encrypted_client_secret = CASE 
      WHEN p_client_secret IS NOT NULL THEN encrypt_banking_credential(p_client_secret)
      ELSE encrypted_client_secret 
    END,
    token_expires_at = COALESCE(p_token_expires_at, token_expires_at),
    last_sync = NOW(),
    updated_at = NOW()
  WHERE id = p_account_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_secure_amazon_account"("p_account_id" "uuid", "p_account_name" "text", "p_refresh_token" "text", "p_access_token" "text", "p_client_id" "text", "p_client_secret" "text", "p_token_expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_secure_bank_account"("p_account_id" "uuid", "p_institution_name" "text" DEFAULT NULL::"text", "p_account_name" "text" DEFAULT NULL::"text", "p_account_type" "text" DEFAULT NULL::"text", "p_balance" numeric DEFAULT NULL::numeric, "p_available_balance" numeric DEFAULT NULL::numeric, "p_currency_code" "text" DEFAULT NULL::"text", "p_access_token" "text" DEFAULT NULL::"text", "p_account_number" "text" DEFAULT NULL::"text", "p_plaid_item_id" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_secure_bank_account"("p_account_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_secure_bank_account"("p_account_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text") IS 'Secure function to update bank accounts with automatic encryption. Regular function with RLS enforcement.';



CREATE OR REPLACE FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text" DEFAULT NULL::"text", "p_account_name" "text" DEFAULT NULL::"text", "p_account_type" "text" DEFAULT NULL::"text", "p_balance" numeric DEFAULT NULL::numeric, "p_credit_limit" numeric DEFAULT NULL::numeric, "p_available_credit" numeric DEFAULT NULL::numeric, "p_currency_code" "text" DEFAULT NULL::"text", "p_access_token" "text" DEFAULT NULL::"text", "p_account_number" "text" DEFAULT NULL::"text", "p_plaid_item_id" "text" DEFAULT NULL::"text", "p_plaid_account_id" "text" DEFAULT NULL::"text", "p_minimum_payment" numeric DEFAULT NULL::numeric, "p_payment_due_date" "date" DEFAULT NULL::"date", "p_statement_close_date" "date" DEFAULT NULL::"date", "p_annual_fee" numeric DEFAULT NULL::numeric, "p_interest_rate" numeric DEFAULT NULL::numeric) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
    interest_rate = COALESCE(p_interest_rate, interest_rate),
    updated_at = NOW()
  WHERE id = p_card_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_interest_rate" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text" DEFAULT NULL::"text", "p_account_name" "text" DEFAULT NULL::"text", "p_account_type" "text" DEFAULT NULL::"text", "p_balance" numeric DEFAULT NULL::numeric, "p_credit_limit" numeric DEFAULT NULL::numeric, "p_available_credit" numeric DEFAULT NULL::numeric, "p_currency_code" "text" DEFAULT NULL::"text", "p_access_token" "text" DEFAULT NULL::"text", "p_account_number" "text" DEFAULT NULL::"text", "p_plaid_item_id" "text" DEFAULT NULL::"text", "p_plaid_account_id" "text" DEFAULT NULL::"text", "p_minimum_payment" numeric DEFAULT NULL::numeric, "p_payment_due_date" "date" DEFAULT NULL::"date", "p_statement_close_date" "date" DEFAULT NULL::"date", "p_annual_fee" numeric DEFAULT NULL::numeric, "p_cash_back" numeric DEFAULT NULL::numeric, "p_priority" integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric, "p_priority" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text" DEFAULT NULL::"text", "p_account_name" "text" DEFAULT NULL::"text", "p_account_type" "text" DEFAULT NULL::"text", "p_balance" numeric DEFAULT NULL::numeric, "p_statement_balance" numeric DEFAULT NULL::numeric, "p_credit_limit" numeric DEFAULT NULL::numeric, "p_available_credit" numeric DEFAULT NULL::numeric, "p_currency_code" "text" DEFAULT NULL::"text", "p_access_token" "text" DEFAULT NULL::"text", "p_account_number" "text" DEFAULT NULL::"text", "p_plaid_item_id" "text" DEFAULT NULL::"text", "p_plaid_account_id" "text" DEFAULT NULL::"text", "p_minimum_payment" numeric DEFAULT NULL::numeric, "p_payment_due_date" "date" DEFAULT NULL::"date", "p_statement_close_date" "date" DEFAULT NULL::"date", "p_annual_fee" numeric DEFAULT NULL::numeric, "p_cash_back" numeric DEFAULT NULL::numeric, "p_priority" integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_statement_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric, "p_priority" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ticket_status_on_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_ticket_user_id UUID;
BEGIN
  -- Get the ticket owner's user_id
  SELECT user_id INTO v_ticket_user_id
  FROM support_tickets
  WHERE id = NEW.ticket_id;
  
  -- If message is from the ticket owner (customer), set to needs_response
  IF NEW.user_id = v_ticket_user_id THEN
    UPDATE support_tickets
    SET status = 'needs_response',
        updated_at = NOW()
    WHERE id = NEW.ticket_id
      AND status NOT IN ('resolved', 'closed');
  
  -- If message is from someone else (admin), set to open (awaiting customer response)
  ELSE
    UPDATE support_tickets
    SET status = 'open',
        updated_at = NOW()
    WHERE id = NEW.ticket_id
      AND status NOT IN ('resolved', 'closed');
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ticket_status_on_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_belongs_to_account"("_account_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE user_id = auth.uid()
    AND account_id = _account_id
  );
$$;


ALTER FUNCTION "public"."user_belongs_to_account"("_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_amazon_seller_uniqueness"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_existing_user_id UUID;
  v_existing_email TEXT;
BEGIN
  -- Only check if activating an account
  IF NEW.is_active = true THEN
    -- Check if seller_id already exists for another active account by a DIFFERENT user
    SELECT aa.user_id, au.email INTO v_existing_user_id, v_existing_email
    FROM amazon_accounts aa
    JOIN auth.users au ON au.id = aa.user_id
    WHERE aa.seller_id = NEW.seller_id 
      AND aa.is_active = true
      AND aa.id != NEW.id
      AND aa.user_id != NEW.user_id  -- CRITICAL: Only block if it's a different user
    LIMIT 1;
    
    IF v_existing_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Amazon Seller ID % is already connected to another account (%). Please log in with that account or contact support at support@auren.app', 
        NEW.seller_id, v_existing_email
      USING ERRCODE = '23505';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_amazon_seller_uniqueness"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_recurring_expense_account_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If account_id is not set, get it from user's profile
  IF NEW.account_id IS NULL THEN
    SELECT account_id INTO NEW.account_id
    FROM public.profiles
    WHERE user_id = NEW.user_id;
    
    IF NEW.account_id IS NULL THEN
      RAISE EXCEPTION 'Cannot create recurring expense: user profile has no account_id';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_recurring_expense_account_id"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_modification_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "old_account_id" "uuid",
    "new_account_id" "uuid",
    "modified_by" "uuid",
    "modified_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."account_modification_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "company" "text",
    "monthly_revenue" "text",
    "amazon_marketplaces" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan_override" "text",
    "plan_override_reason" "text",
    "discount_redeemed_at" timestamp with time zone,
    "currency" "text" DEFAULT 'USD'::"text",
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "account_id" "uuid" DEFAULT "gen_random_uuid"(),
    "is_account_owner" boolean DEFAULT true NOT NULL,
    "max_team_members" integer,
    "account_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "payment_failure_date" timestamp with time zone,
    "stripe_customer_id" "text",
    "churn_date" timestamp with time zone,
    "last_amazon_connection" timestamp with time zone,
    "forecast_settings" "jsonb",
    "monthly_amazon_revenue" "text",
    "email" "text",
    "referral_code" "text",
    "hear_about_us" "text",
    "my_referral_code" "text",
    "plan_tier" "text" DEFAULT 'starter'::"text",
    "max_bank_connections" integer,
    "theme_preference" "text" DEFAULT 'system'::"text",
    CONSTRAINT "profiles_account_status_check" CHECK (("account_status" = ANY (ARRAY['active'::"text", 'suspended_payment'::"text", 'trial_expired'::"text"]))),
    CONSTRAINT "profiles_theme_preference_check" CHECK (("theme_preference" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profile data with strict RLS - users can only access their own profile';



COMMENT ON COLUMN "public"."profiles"."plan_override" IS 'Plan override for special cases. Values: starter, growing, professional, enterprise, lifetime, or other custom plan names. NULL means use subscription-based plan.';



COMMENT ON COLUMN "public"."profiles"."plan_override_reason" IS 'Reason for the plan override';



COMMENT ON COLUMN "public"."profiles"."discount_redeemed_at" IS 'Tracks when the user first redeemed the retention discount (null if never redeemed)';



COMMENT ON COLUMN "public"."profiles"."max_team_members" IS 'Admin override for max team members. NULL = use plan base limit from usePlanLimits. Set explicitly only for addon purchases or custom admin overrides.';



COMMENT ON COLUMN "public"."profiles"."account_status" IS 'Account status: active, suspended_payment, suspended_other';



COMMENT ON COLUMN "public"."profiles"."churn_date" IS 'Date when user churned (trial expired without converting or subscription ended)';



COMMENT ON COLUMN "public"."profiles"."forecast_settings" IS 'Stores user forecast preferences including payout frequency and weight settings';



COMMENT ON COLUMN "public"."profiles"."plan_tier" IS 'Explicit plan tier (professional, growing, starter, enterprise) - separate from trial status';



COMMENT ON COLUMN "public"."profiles"."max_bank_connections" IS 'Admin override for max bank connections. NULL = use plan base limit from usePlanLimits. Set explicitly only for addon purchases or custom admin overrides.';



CREATE TABLE IF NOT EXISTS "public"."recurring_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric DEFAULT 0 NOT NULL,
    "frequency" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "start_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "end_date" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "category" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "transaction_name" "text",
    "type" "text" DEFAULT 'expense'::"text" NOT NULL,
    "account_id" "uuid",
    "credit_card_id" "uuid",
    CONSTRAINT "recurring_expenses_frequency_check" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'bi-weekly'::"text", 'monthly'::"text", 'yearly'::"text", 'weekdays'::"text"])))
);

ALTER TABLE ONLY "public"."recurring_expenses" REPLICA IDENTITY FULL;


ALTER TABLE "public"."recurring_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "vendor_id" "uuid",
    "customer_id" "uuid",
    "transaction_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "due_date" "date",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "remarks" "text" DEFAULT 'Ordered'::"text",
    "credit_card_id" "uuid",
    "account_id" "uuid",
    "category" "text",
    "archived" boolean DEFAULT false NOT NULL,
    CONSTRAINT "transactions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'paid'::"text", 'partially_paid'::"text"]))),
    CONSTRAINT "transactions_type_check" CHECK (("type" = ANY (ARRAY['purchase_order'::"text", 'sales_order'::"text", 'vendor_payment'::"text", 'customer_payment'::"text", 'expense'::"text"])))
);

ALTER TABLE ONLY "public"."transactions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."transactions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."transactions"."remarks" IS 'Status remarks for purchase orders (Ordered, Shipped, Delayed, Received)';



COMMENT ON COLUMN "public"."transactions"."archived" IS 'Whether this transaction has been archived';



CREATE OR REPLACE VIEW "public"."admin_data_visibility_issues" AS
 SELECT "user_id",
    "email",
    "account_id",
    ( SELECT "count"(*) AS "count"
           FROM "public"."recurring_expenses"
          WHERE ("recurring_expenses"."user_id" = "p"."user_id")) AS "recurring_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."recurring_expenses"
          WHERE (("recurring_expenses"."user_id" = "p"."user_id") AND ("recurring_expenses"."account_id" IS NULL))) AS "recurring_missing_account",
    ( SELECT "count"(*) AS "count"
           FROM "public"."transactions"
          WHERE ("transactions"."user_id" = "p"."user_id")) AS "transaction_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."transactions"
          WHERE (("transactions"."user_id" = "p"."user_id") AND ("transactions"."account_id" IS NULL))) AS "transaction_missing_account"
   FROM "public"."profiles" "p"
  WHERE (("account_id" IS NOT NULL) AND ((( SELECT "count"(*) AS "count"
           FROM "public"."recurring_expenses"
          WHERE (("recurring_expenses"."user_id" = "p"."user_id") AND ("recurring_expenses"."account_id" IS NULL))) > 0) OR (( SELECT "count"(*) AS "count"
           FROM "public"."transactions"
          WHERE (("transactions"."user_id" = "p"."user_id") AND ("transactions"."account_id" IS NULL))) > 0)));


ALTER VIEW "public"."admin_data_visibility_issues" OWNER TO "postgres";


COMMENT ON VIEW "public"."admin_data_visibility_issues" IS 'Shows users with potential data visibility issues due to missing account_id values';



CREATE TABLE IF NOT EXISTS "public"."admin_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by" "text",
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "invitation_token" "text",
    "token_expires_at" timestamp with time zone,
    "account_created" boolean DEFAULT false,
    "first_name" "text",
    CONSTRAINT "admin_permissions_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."admin_permissions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."admin_permissions"."account_created" IS 'Indicates if the invited admin/staff has created their auth account. 
Note: If a user creates an account BEFORE receiving an admin invitation, 
this flag must be manually set to true for them to access the admin dashboard.';



CREATE TABLE IF NOT EXISTS "public"."affiliate_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "payment_method" "text" NOT NULL,
    "payment_email" "text",
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "affiliate_payouts_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['paypal'::"text", 'ach'::"text"]))),
    CONSTRAINT "affiliate_payouts_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'paid'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."affiliate_payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."affiliate_referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "referred_user_id" "uuid" NOT NULL,
    "affiliate_code" "text" NOT NULL,
    "status" "text" DEFAULT 'trial'::"text" NOT NULL,
    "subscription_amount" numeric DEFAULT 0,
    "commission_amount" numeric DEFAULT 0,
    "commission_paid" boolean DEFAULT false,
    "converted_at" timestamp with time zone,
    "last_commission_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "affiliate_referrals_status_check" CHECK (("status" = ANY (ARRAY['trial'::"text", 'active'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."affiliate_referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."affiliates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "affiliate_code" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "tier" "text" DEFAULT 'starter'::"text" NOT NULL,
    "commission_rate" integer DEFAULT 20 NOT NULL,
    "total_referrals" integer DEFAULT 0,
    "monthly_referrals" integer DEFAULT 0,
    "total_commission_earned" numeric DEFAULT 0,
    "pending_commission" numeric DEFAULT 0,
    "company_name" "text",
    "website" "text",
    "audience_description" "text",
    "promotional_methods" "text",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "follower_count" integer,
    "trial_referrals" integer DEFAULT 0,
    "paid_referrals" integer DEFAULT 0,
    "churned_referrals" integer DEFAULT 0,
    CONSTRAINT "affiliates_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"]))),
    CONSTRAINT "affiliates_tier_check" CHECK (("tier" = ANY (ARRAY['starter'::"text", 'growth'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."affiliates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."affiliates"."follower_count" IS 'Number of followers the affiliate has';



CREATE TABLE IF NOT EXISTS "public"."amazon_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "seller_id" "text" NOT NULL,
    "marketplace_id" "text" NOT NULL,
    "marketplace_name" "text" NOT NULL,
    "account_name" "text" NOT NULL,
    "encrypted_refresh_token" "text",
    "encrypted_access_token" "text",
    "encrypted_client_id" "text",
    "encrypted_client_secret" "text",
    "token_expires_at" timestamp with time zone,
    "last_sync" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payout_frequency" "text" DEFAULT 'bi-weekly'::"text" NOT NULL,
    "account_id" "uuid",
    "payout_model" "text" DEFAULT 'bi-weekly'::"text" NOT NULL,
    "reserve_lag_days" integer DEFAULT 7 NOT NULL,
    "reserve_multiplier" numeric DEFAULT 1.0 NOT NULL,
    "uses_daily_payouts" boolean DEFAULT false,
    "initial_sync_complete" boolean DEFAULT false,
    "transaction_count" integer DEFAULT 0,
    "sync_status" "text" DEFAULT 'idle'::"text",
    "sync_progress" integer DEFAULT 0,
    "sync_message" "text",
    "last_sync_error" "text",
    "oldest_transaction_date" timestamp with time zone,
    "backfill_complete" boolean DEFAULT false,
    "backfill_target_date" timestamp with time zone,
    "last_synced_to" timestamp with time zone,
    "sync_next_token" "text",
    "rate_limited_until" timestamp with time zone,
    "sync_window_start" timestamp with time zone,
    "sync_window_end" timestamp with time zone,
    "last_settlement_sync_date" timestamp with time zone,
    "sync_notifications_enabled" boolean DEFAULT false,
    "bulk_transaction_sync_complete" boolean DEFAULT false,
    "last_report_sync" timestamp with time zone,
    CONSTRAINT "amazon_accounts_payout_frequency_check" CHECK (("payout_frequency" = ANY (ARRAY['daily'::"text", 'bi-weekly'::"text"]))),
    CONSTRAINT "amazon_accounts_payout_model_check" CHECK (("payout_model" = ANY (ARRAY['bi-weekly'::"text", 'daily'::"text"]))),
    CONSTRAINT "amazon_accounts_sync_progress_check" CHECK ((("sync_progress" >= 0) AND ("sync_progress" <= 100))),
    CONSTRAINT "amazon_accounts_sync_status_check" CHECK (("sync_status" = ANY (ARRAY['idle'::"text", 'syncing'::"text", 'completed'::"text", 'error'::"text"])))
);

ALTER TABLE ONLY "public"."amazon_accounts" REPLICA IDENTITY FULL;


ALTER TABLE "public"."amazon_accounts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."amazon_accounts"."payout_model" IS 'Forecast model: bi-weekly (14-day settlements) or daily (available-to-withdraw)';



COMMENT ON COLUMN "public"."amazon_accounts"."reserve_lag_days" IS 'DD+L reserve policy (default 7 days post-delivery)';



COMMENT ON COLUMN "public"."amazon_accounts"."uses_daily_payouts" IS 'True if account uses daily transfer/payout feature instead of only bi-weekly settlements';



COMMENT ON COLUMN "public"."amazon_accounts"."last_synced_to" IS 'Last date successfully synced - used for incremental daily windows';



COMMENT ON COLUMN "public"."amazon_accounts"."sync_next_token" IS 'Amazon API pagination token for resuming';



COMMENT ON COLUMN "public"."amazon_accounts"."rate_limited_until" IS 'Timestamp when rate limit expires';



COMMENT ON COLUMN "public"."amazon_accounts"."sync_window_start" IS 'Start of current sync date range (for pagination continuation)';



COMMENT ON COLUMN "public"."amazon_accounts"."sync_window_end" IS 'End of current sync date range (for pagination continuation)';



COMMENT ON COLUMN "public"."amazon_accounts"."last_settlement_sync_date" IS 'Tracks the last FinancialEventGroupEnd date synced. Used for incremental settlement fetching to avoid re-fetching full history every sync.';



COMMENT ON COLUMN "public"."amazon_accounts"."sync_notifications_enabled" IS 'Whether to send email notifications when sync completes';



COMMENT ON COLUMN "public"."amazon_accounts"."last_report_sync" IS 'Last time order reports with delivery dates were synced (for daily accounts, twice per day)';



CREATE TABLE IF NOT EXISTS "public"."amazon_connection_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_id" "text" NOT NULL,
    "previous_user_id" "uuid",
    "new_user_id" "uuid",
    "action" "text" NOT NULL,
    "reason" "text",
    "performed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."amazon_connection_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."amazon_daily_draws" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "amazon_account_id" "uuid" NOT NULL,
    "settlement_id" "text" NOT NULL,
    "settlement_period_start" "date" NOT NULL,
    "settlement_period_end" "date" NOT NULL,
    "draw_date" "date" NOT NULL,
    "amount" numeric NOT NULL,
    "notes" "text",
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."amazon_daily_draws" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."amazon_daily_rollups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "amazon_account_id" "uuid" NOT NULL,
    "rollup_date" "date" NOT NULL,
    "total_orders" integer DEFAULT 0,
    "total_revenue" numeric DEFAULT 0,
    "total_fees" numeric DEFAULT 0,
    "total_refunds" numeric DEFAULT 0,
    "total_net" numeric DEFAULT 0,
    "order_count" integer DEFAULT 0,
    "refund_count" integer DEFAULT 0,
    "adjustment_count" integer DEFAULT 0,
    "fee_count" integer DEFAULT 0,
    "currency_code" "text" DEFAULT 'USD'::"text" NOT NULL,
    "marketplace_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."amazon_daily_rollups" OWNER TO "postgres";


COMMENT ON TABLE "public"."amazon_daily_rollups" IS 'Aggregated daily summaries for Amazon transactions older than 30 days - used for efficient storage and trend analysis';



CREATE TABLE IF NOT EXISTS "public"."amazon_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amazon_account_id" "uuid" NOT NULL,
    "settlement_id" "text" NOT NULL,
    "payout_date" "date" NOT NULL,
    "total_amount" numeric DEFAULT 0 NOT NULL,
    "currency_code" "text" DEFAULT 'USD'::"text" NOT NULL,
    "status" "text" DEFAULT 'estimated'::"text" NOT NULL,
    "payout_type" "text" DEFAULT 'bi-weekly'::"text" NOT NULL,
    "marketplace_name" "text" NOT NULL,
    "transaction_count" integer DEFAULT 0,
    "fees_total" numeric DEFAULT 0,
    "orders_total" numeric DEFAULT 0,
    "refunds_total" numeric DEFAULT 0,
    "other_total" numeric DEFAULT 0,
    "raw_settlement_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    "original_forecast_amount" numeric,
    "forecast_replaced_at" timestamp with time zone,
    "forecast_accuracy_percentage" numeric,
    "eligible_in_period" numeric,
    "reserve_amount" numeric,
    "adjustments" numeric DEFAULT 0,
    "modeling_method" "text",
    "total_daily_draws" numeric DEFAULT 0,
    "available_for_daily_transfer" numeric DEFAULT 0,
    "last_draw_calculation_date" "date",
    CONSTRAINT "amazon_payouts_modeling_method_check" CHECK (("modeling_method" = ANY (ARRAY['mathematical_biweekly'::"text", 'mathematical_daily'::"text", 'ai_forecast'::"text", 'baseline_estimate'::"text", 'auren_forecast_v1'::"text"]))),
    CONSTRAINT "amazon_payouts_status_check" CHECK (("status" = ANY (ARRAY['confirmed'::"text", 'forecasted'::"text", 'estimated'::"text", 'rolled_over'::"text"])))
);

ALTER TABLE ONLY "public"."amazon_payouts" REPLICA IDENTITY FULL;


ALTER TABLE "public"."amazon_payouts" OWNER TO "postgres";


COMMENT ON TABLE "public"."amazon_payouts" IS 'Stores Amazon settlement payouts. This is the primary source for Amazon revenue data (net payouts that hit bank account). Replaces old amazon_transactions system.';



COMMENT ON COLUMN "public"."amazon_payouts"."original_forecast_amount" IS 'Original AI forecasted amount before being replaced by actual payout data';



COMMENT ON COLUMN "public"."amazon_payouts"."forecast_replaced_at" IS 'Timestamp when forecasted payout was replaced with actual data';



COMMENT ON COLUMN "public"."amazon_payouts"."forecast_accuracy_percentage" IS 'Percentage accuracy of forecast vs actual (100 = perfect match)';



COMMENT ON COLUMN "public"."amazon_payouts"."eligible_in_period" IS 'Sum of eligible cash in settlement period';



COMMENT ON COLUMN "public"."amazon_payouts"."reserve_amount" IS 'Modeled reserve held by Amazon';



COMMENT ON COLUMN "public"."amazon_payouts"."modeling_method" IS 'Forecasting method used';



COMMENT ON COLUMN "public"."amazon_payouts"."total_daily_draws" IS 'Sum of all daily draws taken from this settlement bucket';



COMMENT ON COLUMN "public"."amazon_payouts"."available_for_daily_transfer" IS 'Amount currently available for daily transfer (eligible - reserve - draws)';



COMMENT ON COLUMN "public"."amazon_payouts"."last_draw_calculation_date" IS 'Last date the available transfer amount was calculated';



CREATE TABLE IF NOT EXISTS "public"."amazon_sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "sync_type" "text" NOT NULL,
    "sync_status" "text" NOT NULL,
    "transactions_synced" integer DEFAULT 0,
    "payouts_synced" integer DEFAULT 0,
    "error_message" "text",
    "sync_duration_ms" integer,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."amazon_sync_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."amazon_sync_logs" IS 'Historical log of Amazon account sync operations';



CREATE TABLE IF NOT EXISTS "public"."amazon_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "amazon_account_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "transaction_id" "text" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "transaction_date" timestamp with time zone NOT NULL,
    "delivery_date" timestamp with time zone,
    "amount" numeric DEFAULT 0 NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."amazon_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."amazon_transactions" IS 'Order-level transaction data from Amazon Reports API with delivery dates for DD+7 forecasting';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "user_id" "uuid",
    "record_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "institution_name" "text" NOT NULL,
    "account_name" "text" NOT NULL,
    "account_type" "text" NOT NULL,
    "balance" numeric DEFAULT 0 NOT NULL,
    "available_balance" numeric,
    "currency_code" "text" DEFAULT 'USD'::"text",
    "last_sync" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "encrypted_access_token" "text",
    "encrypted_account_number" "text",
    "encrypted_plaid_item_id" "text",
    "plaid_account_id" "text",
    "account_id" "uuid",
    "initial_balance" numeric(12,2),
    "initial_balance_date" timestamp with time zone
);

ALTER TABLE ONLY "public"."bank_accounts" REPLICA IDENTITY FULL;


ALTER TABLE "public"."bank_accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."bank_accounts" IS 'Sensitive financial data with strict RLS - users can only access their own bank accounts';



COMMENT ON COLUMN "public"."bank_accounts"."balance" IS 'Calculated balance: initial_balance + sum of transactions since initial_balance_date';



COMMENT ON COLUMN "public"."bank_accounts"."initial_balance" IS 'Snapshot of balance at initial_balance_date. Current balance calculated from this + sum of transactions';



CREATE TABLE IF NOT EXISTS "public"."bank_sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sync_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accounts_synced" integer DEFAULT 0 NOT NULL,
    "total_accounts" integer DEFAULT 0 NOT NULL,
    "total_transactions" integer DEFAULT 0 NOT NULL,
    "success" boolean DEFAULT true NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bank_sync_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."bank_sync_logs" IS 'Logs for automatic hourly bank transaction syncs';



COMMENT ON COLUMN "public"."bank_sync_logs"."sync_time" IS 'When the sync was executed';



COMMENT ON COLUMN "public"."bank_sync_logs"."accounts_synced" IS 'Number of accounts successfully synced';



COMMENT ON COLUMN "public"."bank_sync_logs"."total_accounts" IS 'Total number of accounts attempted';



CREATE TABLE IF NOT EXISTS "public"."bank_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "bank_account_id" "uuid",
    "plaid_transaction_id" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "date" "date" NOT NULL,
    "name" "text" NOT NULL,
    "merchant_name" "text",
    "category" "text"[],
    "pending" boolean DEFAULT false NOT NULL,
    "payment_channel" "text",
    "transaction_type" "text",
    "currency_code" "text" DEFAULT 'USD'::"text",
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "matched_transaction_id" "uuid",
    "matched_type" "text",
    "account_id" "uuid",
    "credit_card_id" "uuid",
    "archived" boolean DEFAULT false NOT NULL,
    CONSTRAINT "bank_transactions_matched_type_check" CHECK (("matched_type" = ANY (ARRAY['income'::"text", 'vendor'::"text"])))
);


ALTER TABLE "public"."bank_transactions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bank_transactions"."matched_transaction_id" IS 'ID of the income or vendor transaction this was matched with';



COMMENT ON COLUMN "public"."bank_transactions"."matched_type" IS 'Type of transaction this was matched with (income or vendor)';



COMMENT ON COLUMN "public"."bank_transactions"."credit_card_id" IS 'Reference to credit card if transaction is from a credit card account';



COMMENT ON COLUMN "public"."bank_transactions"."archived" IS 'Whether this bank transaction has been matched and archived';



CREATE TABLE IF NOT EXISTS "public"."cash_flow_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "vendor_id" "uuid",
    "customer_id" "uuid",
    "event_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    CONSTRAINT "cash_flow_events_type_check" CHECK (("type" = ANY (ARRAY['income'::"text", 'expense'::"text", 'vendor_payment'::"text", 'customer_payment'::"text"])))
);


ALTER TABLE "public"."cash_flow_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_flow_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "insight_date" "date" NOT NULL,
    "advice" "text" NOT NULL,
    "current_balance" numeric,
    "daily_inflow" numeric,
    "daily_outflow" numeric,
    "upcoming_expenses" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid"
);


ALTER TABLE "public"."cash_flow_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_recurring" boolean DEFAULT false,
    CONSTRAINT "categories_type_check" CHECK (("type" = ANY (ARRAY['expense'::"text", 'income'::"text", 'purchase_order'::"text"])))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_card_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "credit_card_id" "uuid" NOT NULL,
    "bank_account_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "payment_date" "date" NOT NULL,
    "description" "text",
    "payment_type" "text" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "was_paid" boolean DEFAULT true,
    CONSTRAINT "credit_card_payments_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['manual'::"text", 'bill_payment'::"text"]))),
    CONSTRAINT "credit_card_payments_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."credit_card_payments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."credit_card_payments"."was_paid" IS 'Tracks whether the payment was actually completed in real life. Default TRUE assumes overdue payments were made unless user explicitly marks them as not paid.';



CREATE TABLE IF NOT EXISTS "public"."credit_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "institution_name" "text" NOT NULL,
    "account_name" "text" NOT NULL,
    "account_type" "text" DEFAULT 'credit'::"text" NOT NULL,
    "masked_account_number" "text",
    "balance" numeric DEFAULT 0 NOT NULL,
    "credit_limit" numeric DEFAULT 0 NOT NULL,
    "available_credit" numeric DEFAULT 0 NOT NULL,
    "currency_code" "text" DEFAULT 'USD'::"text" NOT NULL,
    "encrypted_access_token" "text",
    "encrypted_account_number" "text",
    "encrypted_plaid_item_id" "text",
    "last_sync" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plaid_account_id" "text",
    "minimum_payment" numeric DEFAULT 0,
    "payment_due_date" "date",
    "statement_close_date" "date",
    "annual_fee" numeric DEFAULT 0,
    "interest_rate" numeric DEFAULT 0,
    "priority" integer DEFAULT 3,
    "cash_back" numeric DEFAULT 0,
    "nickname" "text",
    "statement_balance" numeric DEFAULT 0,
    "forecast_next_month" boolean DEFAULT false,
    "pay_minimum" boolean DEFAULT false,
    "account_id" "uuid",
    "initial_balance" numeric(12,2),
    "initial_balance_date" timestamp with time zone,
    "credit_limit_override" numeric,
    CONSTRAINT "credit_cards_cash_back_check" CHECK ((("cash_back" >= (0)::numeric) AND ("cash_back" <= (100)::numeric))),
    CONSTRAINT "credit_cards_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 5)))
);


ALTER TABLE "public"."credit_cards" OWNER TO "postgres";


COMMENT ON COLUMN "public"."credit_cards"."balance" IS 'Calculated balance: initial_balance + sum of credit card transactions since initial_balance_date';



COMMENT ON COLUMN "public"."credit_cards"."priority" IS 'Payment priority: 1 (highest) to 5 (lowest)';



COMMENT ON COLUMN "public"."credit_cards"."cash_back" IS 'Cash back percentage (0-100)';



COMMENT ON COLUMN "public"."credit_cards"."statement_balance" IS 'Balance from the last billing statement';



COMMENT ON COLUMN "public"."credit_cards"."forecast_next_month" IS 'Whether to forecast the next month payment based on projected usage';



COMMENT ON COLUMN "public"."credit_cards"."pay_minimum" IS 'Whether to pay only the minimum payment (emergency use only - will incur interest)';



COMMENT ON COLUMN "public"."credit_cards"."initial_balance" IS 'Snapshot of balance at initial_balance_date. Current balance calculated from this + sum of transactions';



COMMENT ON COLUMN "public"."credit_cards"."credit_limit_override" IS 'User-defined credit limit override for extended purchasing power beyond the standard credit limit';



CREATE TABLE IF NOT EXISTS "public"."custom_discount_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "discount_percentage" integer NOT NULL,
    "duration_months" integer DEFAULT 3 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "custom_discount_codes_discount_percentage_check" CHECK ((("discount_percentage" > 0) AND ("discount_percentage" <= 100)))
);


ALTER TABLE "public"."custom_discount_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "payment_terms" "text" DEFAULT 'immediate'::"text",
    "net_terms_days" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    "category" "text",
    CONSTRAINT "customers_payment_terms_check" CHECK (("payment_terms" = ANY (ARRAY['immediate'::"text", 'net'::"text"])))
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deleted_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "original_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "description" "text",
    "payment_date" "date",
    "status" "text",
    "category" "text",
    "deleted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb",
    CONSTRAINT "deleted_transactions_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['vendor'::"text", 'income'::"text"])))
);


ALTER TABLE "public"."deleted_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents_metadata" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "customer_id" "uuid",
    "vendor_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text",
    "document_date" "date",
    "amount" numeric,
    "description" "text",
    "document_type" "text",
    "account_id" "uuid"
);


ALTER TABLE "public"."documents_metadata" OWNER TO "postgres";


COMMENT ON COLUMN "public"."documents_metadata"."amount" IS 'Purchase order or transaction amount';



COMMENT ON COLUMN "public"."documents_metadata"."description" IS 'Description or notes about the document';



COMMENT ON COLUMN "public"."documents_metadata"."document_type" IS 'Type of document: invoice, purchase_order, receipt, etc.';



CREATE TABLE IF NOT EXISTS "public"."feature_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "priority" "text" NOT NULL,
    "category" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feature_requests_category_check" CHECK (("category" = ANY (ARRAY['feature'::"text", 'improvement'::"text", 'bug'::"text", 'integration'::"text"]))),
    CONSTRAINT "feature_requests_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "feature_requests_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'completed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."feature_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forecast_accuracy_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "amazon_account_id" "uuid",
    "payout_date" "date" NOT NULL,
    "forecasted_amount" numeric NOT NULL,
    "actual_amount" numeric NOT NULL,
    "difference_amount" numeric NOT NULL,
    "difference_percentage" numeric NOT NULL,
    "settlement_id" "text" NOT NULL,
    "marketplace_name" "text",
    "user_email" "text",
    "user_name" "text",
    "monthly_revenue" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "modeling_method" "text",
    "confidence_threshold" numeric,
    "settlement_close_date" "date",
    "settlement_period_start" "date",
    "settlement_period_end" "date",
    "days_accumulated" integer DEFAULT 1,
    "forecasted_amounts_by_day" "jsonb"
);


ALTER TABLE "public"."forecast_accuracy_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."forecast_accuracy_log" IS 'Historical accuracy tracking - never delete old records to track improvements over time';



COMMENT ON COLUMN "public"."forecast_accuracy_log"."modeling_method" IS 'The forecasting algorithm used (e.g., auren_forecast_v1)';



CREATE TABLE IF NOT EXISTS "public"."income" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "payment_date" "date" NOT NULL,
    "source" "text" DEFAULT 'Manual Entry'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "category" "text",
    "is_recurring" boolean DEFAULT false NOT NULL,
    "recurring_frequency" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_id" "uuid",
    "account_id" "uuid",
    "archived" boolean DEFAULT false NOT NULL,
    CONSTRAINT "income_recurring_frequency_check" CHECK (("recurring_frequency" = ANY (ARRAY['weekly'::"text", 'bi-weekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'yearly'::"text", 'weekdays'::"text"]))),
    CONSTRAINT "income_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'pending'::"text", 'overdue'::"text"])))
);

ALTER TABLE ONLY "public"."income" REPLICA IDENTITY FULL;


ALTER TABLE "public"."income" OWNER TO "postgres";


COMMENT ON COLUMN "public"."income"."archived" IS 'Whether this income record has been archived';



CREATE TABLE IF NOT EXISTS "public"."monthly_support_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "month_year" "text" NOT NULL,
    "cases_opened" integer DEFAULT 0 NOT NULL,
    "cases_closed" integer DEFAULT 0 NOT NULL,
    "avg_resolution_days" numeric(10,2) DEFAULT 0,
    "first_response_hours" numeric(10,2) DEFAULT 0,
    "avg_response_hours" numeric(10,2) DEFAULT 0,
    "sla_within_4_hours" integer DEFAULT 0,
    "sla_within_24_hours" integer DEFAULT 0,
    "response_time_by_priority" "jsonb" DEFAULT '[]'::"jsonb",
    "response_time_by_category" "jsonb" DEFAULT '[]'::"jsonb",
    "cases_by_category" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."monthly_support_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."monthly_support_metrics" IS 'Stores monthly snapshots of support ticket metrics for historical tracking and month-over-month comparison';



CREATE TABLE IF NOT EXISTS "public"."notification_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "category" "text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text",
    "amount" numeric,
    "due_date" "date",
    "read" boolean DEFAULT false,
    "actionable" boolean DEFAULT false,
    "action_label" "text",
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    "action_url" "text"
);


ALTER TABLE "public"."notification_history" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notification_history"."action_url" IS 'URL for action button in notification';



CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "schedule_time" time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    "schedule_days" integer[] DEFAULT ARRAY[1, 2, 3, 4, 5],
    "threshold_amount" numeric,
    "advance_days" integer DEFAULT 3,
    "notification_channels" "text"[] DEFAULT ARRAY['in_app'::"text"],
    "last_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    "email_recipients" "text"[] DEFAULT ARRAY[]::"text"[]
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notification_preferences"."email_recipients" IS 'Array of email addresses to send notifications to';



CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."password_reset_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "name" "text" NOT NULL,
    "category" "text",
    "payment_method" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payees_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['bank-transfer'::"text", 'credit-card'::"text"])))
);


ALTER TABLE "public"."payees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_name" "text" NOT NULL,
    "bank_connections" integer NOT NULL,
    "amazon_connections" integer NOT NULL,
    "team_members" integer NOT NULL,
    "has_ai_insights" boolean DEFAULT false,
    "has_ai_pdf_extractor" boolean DEFAULT false,
    "has_automated_notifications" boolean DEFAULT false,
    "has_scenario_planning" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."plan_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_override_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_email" "text" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "changed_by_email" "text" NOT NULL,
    "old_plan_tier" "text",
    "new_plan_tier" "text" NOT NULL,
    "old_max_bank_connections" integer,
    "new_max_bank_connections" integer,
    "old_max_team_members" integer,
    "new_max_team_members" integer,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plan_override_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_order_line_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "document_id" "uuid",
    "vendor_id" "uuid",
    "sku" "text",
    "product_name" "text" NOT NULL,
    "quantity" numeric DEFAULT 1,
    "unit_price" numeric DEFAULT 0,
    "total_price" numeric GENERATED ALWAYS AS (("quantity" * "unit_price")) STORED,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."purchase_order_line_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchased_addons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "addon_type" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "price_paid" numeric NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "stripe_payment_intent_id" "text",
    "stripe_charge_id" "text",
    "purchased_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "purchased_addons_addon_type_check" CHECK (("addon_type" = ANY (ARRAY['bank_connection'::"text", 'amazon_connection'::"text"]))),
    CONSTRAINT "purchased_addons_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."purchased_addons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_expense_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "recurring_expense_id" "uuid" NOT NULL,
    "exception_date" "date" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recurring_expense_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code_type" "text",
    "owner_id" "uuid",
    "discount_percentage" integer DEFAULT 10 NOT NULL,
    "duration_months" integer DEFAULT 3 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "max_uses" integer,
    "current_uses" integer DEFAULT 0 NOT NULL,
    "last_used_at" timestamp with time zone,
    CONSTRAINT "check_current_uses_non_negative" CHECK (("current_uses" >= 0)),
    CONSTRAINT "check_max_uses_positive" CHECK ((("max_uses" IS NULL) OR ("max_uses" >= 1))),
    CONSTRAINT "valid_code_type" CHECK (("code_type" = ANY (ARRAY['user'::"text", 'affiliate'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."referral_codes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."referral_codes"."max_uses" IS 'Maximum number of times this code can be redeemed. NULL means unlimited.';



COMMENT ON COLUMN "public"."referral_codes"."current_uses" IS 'Number of times this code has been successfully redeemed.';



CREATE TABLE IF NOT EXISTS "public"."referral_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "referral_count" integer DEFAULT 0 NOT NULL,
    "tier_level" integer DEFAULT 0 NOT NULL,
    "discount_percentage" integer DEFAULT 0,
    "cash_bonus" numeric DEFAULT 0,
    "total_cash_earned" numeric DEFAULT 0,
    "reward_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "discount_start_date" timestamp with time zone,
    "discount_end_date" timestamp with time zone,
    "annual_reset_date" timestamp with time zone DEFAULT ("now"() + '1 year'::interval),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pending_cash_bonus" numeric DEFAULT 0,
    "last_ticket_tier" integer DEFAULT 0,
    CONSTRAINT "referral_rewards_reward_status_check" CHECK (("reward_status" = ANY (ARRAY['pending'::"text", 'applied'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."referral_rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid" NOT NULL,
    "referred_user_id" "uuid" NOT NULL,
    "referral_code" "text" NOT NULL,
    "status" "text" DEFAULT 'trial'::"text" NOT NULL,
    "converted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "referred_user_discount_applied" boolean DEFAULT false,
    CONSTRAINT "referrals_status_check" CHECK (("status" = ANY (ARRAY['trial'::"text", 'active'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scenarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "scenario_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid"
);


ALTER TABLE "public"."scenarios" OWNER TO "postgres";


COMMENT ON TABLE "public"."scenarios" IS 'Stores financial scenario planning data for users';



CREATE TABLE IF NOT EXISTS "public"."stripe_customer_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "old_customer_id" "text",
    "new_customer_id" "text",
    "performed_by" "uuid",
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "credit_cards" integer DEFAULT 0,
    CONSTRAINT "stripe_customer_audit_log_action_check" CHECK (("action" = ANY (ARRAY['audit'::"text", 'update'::"text", 'clear'::"text", 'create'::"text", 'auto_fix'::"text"])))
);


ALTER TABLE "public"."stripe_customer_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'needs_response'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "category" "text",
    "assigned_to" "uuid",
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "admin_last_viewed_at" timestamp with time zone,
    "customer_last_viewed_at" timestamp with time zone,
    "claimed_by" "uuid",
    "claimed_at" timestamp with time zone,
    "ticket_number" integer NOT NULL,
    CONSTRAINT "support_tickets_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "support_tickets_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'needs_response'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."support_tickets_ticket_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."support_tickets_ticket_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."support_tickets_ticket_number_seq" OWNED BY "public"."support_tickets"."ticket_number";



CREATE TABLE IF NOT EXISTS "public"."team_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."app_role" DEFAULT 'staff'::"public"."app_role" NOT NULL,
    "token" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ticket_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."ticket_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "is_internal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trial_addon_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "addon_type" "text" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trial_addon_usage_addon_type_check" CHECK (("addon_type" = ANY (ARRAY['bank_account'::"text", 'amazon_account'::"text", 'user'::"text"])))
);


ALTER TABLE "public"."trial_addon_usage" OWNER TO "postgres";


COMMENT ON TABLE "public"."trial_addon_usage" IS 'Tracks add-on usage during trial period for automatic conversion to paid add-ons';



COMMENT ON COLUMN "public"."trial_addon_usage"."addon_type" IS 'Type of add-on: bank_account, amazon_account, or user';



COMMENT ON COLUMN "public"."trial_addon_usage"."quantity" IS 'Number of additional items beyond plan limits';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "role" "public"."app_role" DEFAULT 'staff'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_cash" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "safe_spending_percentage" integer DEFAULT 20,
    "safe_spending_reserve" numeric DEFAULT 0,
    "last_forecast_refresh" timestamp with time zone,
    "chart_show_cashflow_line" boolean DEFAULT true,
    "chart_show_resources_line" boolean DEFAULT true,
    "chart_show_credit_line" boolean DEFAULT true,
    "chart_show_reserve_line" boolean DEFAULT true,
    "chart_cashflow_color" "text" DEFAULT 'hsl(221, 83%, 53%)'::"text",
    "chart_resources_color" "text" DEFAULT '#10b981'::"text",
    "chart_credit_color" "text" DEFAULT '#f59e0b'::"text",
    "chart_reserve_color" "text" DEFAULT '#ef4444'::"text",
    "chart_show_forecast_line" boolean DEFAULT true,
    "chart_forecast_color" "text" DEFAULT '#a855f7'::"text",
    "account_id" "uuid",
    "reserve_last_updated_at" timestamp with time zone DEFAULT "now"(),
    "forecast_confidence_threshold" integer DEFAULT 8,
    "forecasts_enabled" boolean DEFAULT false,
    "forecasts_disabled_at" timestamp with time zone,
    "advanced_modeling_enabled" boolean DEFAULT false,
    "advanced_modeling_notified" boolean DEFAULT false,
    "default_reserve_lag_days" integer DEFAULT 7,
    "min_reserve_floor" numeric DEFAULT 1000,
    "chart_show_lowest_balance_line" boolean DEFAULT true,
    "chart_lowest_balance_color" "text" DEFAULT '#ef4444'::"text",
    "welcome_animation_shown" boolean DEFAULT false,
    CONSTRAINT "user_settings_forecast_confidence_threshold_check" CHECK (("forecast_confidence_threshold" = ANY (ARRAY[3, 8, 15]))),
    CONSTRAINT "user_settings_safe_spending_percentage_check" CHECK ((("safe_spending_percentage" >= 0) AND ("safe_spending_percentage" <= 70)))
);

ALTER TABLE ONLY "public"."user_settings" REPLICA IDENTITY FULL;


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_settings"."forecast_confidence_threshold" IS 'Valid values: 3 (Aggressive/Fast Cycle), 8 (Moderate/Balanced), 15 (Conservative/Safe)';



COMMENT ON COLUMN "public"."user_settings"."forecasts_enabled" IS 'Whether AI forecasting is enabled for this user. Defaults to false - users opt-in during onboarding.';



COMMENT ON COLUMN "public"."user_settings"."forecasts_disabled_at" IS 'Timestamp when forecasts were disabled. User must wait 24 hours before re-enabling.';



CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "total_owed" numeric(10,2) DEFAULT 0,
    "next_payment_date" "date",
    "next_payment_amount" numeric(10,2) DEFAULT 0,
    "status" "text" DEFAULT 'upcoming'::"text",
    "category" "text",
    "payment_type" "text" DEFAULT 'total'::"text",
    "net_terms_days" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "po_name" "text",
    "description" "text",
    "notes" "text",
    "payment_schedule" "jsonb",
    "source" "text" DEFAULT 'management'::"text",
    "remarks" "text",
    "account_id" "uuid",
    "payment_method" "text" DEFAULT 'bank-transfer'::"text",
    CONSTRAINT "vendors_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['bank-transfer'::"text", 'credit-card'::"text"]))),
    CONSTRAINT "vendors_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['due-upon-order'::"text", 'net-terms'::"text", 'preorder'::"text", 'due-upon-delivery'::"text"]))),
    CONSTRAINT "vendors_source_check" CHECK (("source" = ANY (ARRAY['purchase_order'::"text", 'management'::"text"]))),
    CONSTRAINT "vendors_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'current'::"text", 'overdue'::"text", 'paid'::"text"])))
);

ALTER TABLE ONLY "public"."vendors" REPLICA IDENTITY FULL;


ALTER TABLE "public"."vendors" OWNER TO "postgres";


ALTER TABLE ONLY "public"."support_tickets" ALTER COLUMN "ticket_number" SET DEFAULT "nextval"('"public"."support_tickets_ticket_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."account_modification_audit"
    ADD CONSTRAINT "account_modification_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_payouts"
    ADD CONSTRAINT "affiliate_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_referrals"
    ADD CONSTRAINT "affiliate_referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_referrals"
    ADD CONSTRAINT "affiliate_referrals_referred_user_id_key" UNIQUE ("referred_user_id");



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_affiliate_code_key" UNIQUE ("affiliate_code");



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."amazon_accounts"
    ADD CONSTRAINT "amazon_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amazon_connection_audit"
    ADD CONSTRAINT "amazon_connection_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amazon_daily_draws"
    ADD CONSTRAINT "amazon_daily_draws_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amazon_daily_rollups"
    ADD CONSTRAINT "amazon_daily_rollups_amazon_account_id_rollup_date_key" UNIQUE ("amazon_account_id", "rollup_date");



ALTER TABLE ONLY "public"."amazon_daily_rollups"
    ADD CONSTRAINT "amazon_daily_rollups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amazon_payouts"
    ADD CONSTRAINT "amazon_payouts_amazon_account_id_settlement_id_key" UNIQUE ("amazon_account_id", "settlement_id");



ALTER TABLE ONLY "public"."amazon_payouts"
    ADD CONSTRAINT "amazon_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amazon_sync_logs"
    ADD CONSTRAINT "amazon_sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amazon_transactions"
    ADD CONSTRAINT "amazon_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amazon_transactions"
    ADD CONSTRAINT "amazon_transactions_transaction_id_amazon_account_id_key" UNIQUE ("transaction_id", "amazon_account_id");



ALTER TABLE ONLY "public"."amazon_transactions"
    ADD CONSTRAINT "amazon_transactions_transaction_id_unique" UNIQUE ("transaction_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_sync_logs"
    ADD CONSTRAINT "bank_sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_transactions"
    ADD CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_transactions"
    ADD CONSTRAINT "bank_transactions_plaid_transaction_id_bank_account_id_key" UNIQUE ("plaid_transaction_id", "bank_account_id");



ALTER TABLE ONLY "public"."cash_flow_events"
    ADD CONSTRAINT "cash_flow_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_flow_insights"
    ADD CONSTRAINT "cash_flow_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_flow_insights"
    ADD CONSTRAINT "cash_flow_insights_user_id_insight_date_key" UNIQUE ("user_id", "insight_date");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_name_type_key" UNIQUE ("user_id", "name", "type");



ALTER TABLE ONLY "public"."credit_card_payments"
    ADD CONSTRAINT "credit_card_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_cards"
    ADD CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_discount_codes"
    ADD CONSTRAINT "custom_discount_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."custom_discount_codes"
    ADD CONSTRAINT "custom_discount_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deleted_transactions"
    ADD CONSTRAINT "deleted_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents_metadata"
    ADD CONSTRAINT "documents_metadata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents_metadata"
    ADD CONSTRAINT "documents_metadata_user_id_file_path_key" UNIQUE ("user_id", "file_path");



ALTER TABLE ONLY "public"."feature_requests"
    ADD CONSTRAINT "feature_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forecast_accuracy_log"
    ADD CONSTRAINT "forecast_accuracy_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forecast_accuracy_log"
    ADD CONSTRAINT "forecast_accuracy_log_settlement_id_key" UNIQUE ("settlement_id");



ALTER TABLE ONLY "public"."income"
    ADD CONSTRAINT "income_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_support_metrics"
    ADD CONSTRAINT "monthly_support_metrics_month_year_key" UNIQUE ("month_year");



ALTER TABLE ONLY "public"."monthly_support_metrics"
    ADD CONSTRAINT "monthly_support_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_history"
    ADD CONSTRAINT "notification_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_type_account_unique" UNIQUE ("user_id", "notification_type", "account_id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."payees"
    ADD CONSTRAINT "payees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_limits"
    ADD CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_limits"
    ADD CONSTRAINT "plan_limits_plan_name_key" UNIQUE ("plan_name");



ALTER TABLE ONLY "public"."plan_override_audit"
    ADD CONSTRAINT "plan_override_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_my_referral_code_key" UNIQUE ("my_referral_code");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."purchase_order_line_items"
    ADD CONSTRAINT "purchase_order_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchased_addons"
    ADD CONSTRAINT "purchased_addons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_expense_exceptions"
    ADD CONSTRAINT "recurring_expense_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_expense_exceptions"
    ADD CONSTRAINT "recurring_expense_exceptions_recurring_expense_id_exception_key" UNIQUE ("recurring_expense_id", "exception_date");



ALTER TABLE ONLY "public"."recurring_expenses"
    ADD CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_rewards"
    ADD CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_rewards"
    ADD CONSTRAINT "referral_rewards_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_user_id_key" UNIQUE ("referred_user_id");



ALTER TABLE ONLY "public"."scenarios"
    ADD CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_customer_audit_log"
    ADD CONSTRAINT "stripe_customer_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_account_id_email_key" UNIQUE ("account_id", "email");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."ticket_feedback"
    ADD CONSTRAINT "ticket_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trial_addon_usage"
    ADD CONSTRAINT "trial_addon_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trial_addon_usage"
    ADD CONSTRAINT "trial_addon_usage_user_id_addon_type_key" UNIQUE ("user_id", "addon_type");



ALTER TABLE ONLY "public"."amazon_payouts"
    ADD CONSTRAINT "unique_amazon_payout_settlement" UNIQUE ("amazon_account_id", "settlement_id");



ALTER TABLE ONLY "public"."credit_card_payments"
    ADD CONSTRAINT "unique_credit_card_payment" UNIQUE ("credit_card_id", "payment_date", "payment_type");



ALTER TABLE ONLY "public"."amazon_payouts"
    ADD CONSTRAINT "unique_payout_account_date_status" UNIQUE ("amazon_account_id", "payout_date", "status");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "customers_user_name_unique" ON "public"."customers" USING "btree" ("user_id", "lower"("name"));



CREATE INDEX "idx_admin_permissions_email" ON "public"."admin_permissions" USING "btree" ("email");



CREATE INDEX "idx_affiliate_referrals_affiliate" ON "public"."affiliate_referrals" USING "btree" ("affiliate_id");



CREATE INDEX "idx_affiliate_referrals_referred" ON "public"."affiliate_referrals" USING "btree" ("referred_user_id");



CREATE INDEX "idx_affiliates_code" ON "public"."affiliates" USING "btree" ("affiliate_code");



CREATE INDEX "idx_amazon_accounts_seller_id" ON "public"."amazon_accounts" USING "btree" ("seller_id");



CREATE INDEX "idx_amazon_accounts_sync_status" ON "public"."amazon_accounts" USING "btree" ("sync_status");



CREATE INDEX "idx_amazon_accounts_user_id" ON "public"."amazon_accounts" USING "btree" ("user_id");



CREATE INDEX "idx_amazon_accounts_user_sync" ON "public"."amazon_accounts" USING "btree" ("user_id", "sync_status");



CREATE INDEX "idx_amazon_payouts_account_id" ON "public"."amazon_payouts" USING "btree" ("amazon_account_id");



CREATE INDEX "idx_amazon_payouts_account_status" ON "public"."amazon_payouts" USING "btree" ("amazon_account_id", "status", "payout_date");



CREATE INDEX "idx_amazon_payouts_date" ON "public"."amazon_payouts" USING "btree" ("payout_date");



CREATE INDEX "idx_amazon_payouts_forecast_replaced" ON "public"."amazon_payouts" USING "btree" ("forecast_replaced_at") WHERE ("forecast_replaced_at" IS NOT NULL);



CREATE UNIQUE INDEX "idx_amazon_payouts_forecast_unique" ON "public"."amazon_payouts" USING "btree" ("amazon_account_id", "payout_date", "status") WHERE ("status" = 'forecasted'::"text");



CREATE INDEX "idx_amazon_payouts_user_id" ON "public"."amazon_payouts" USING "btree" ("user_id");



CREATE INDEX "idx_amazon_payouts_user_status" ON "public"."amazon_payouts" USING "btree" ("user_id", "status", "payout_date");



CREATE INDEX "idx_amazon_sync_logs_account_id" ON "public"."amazon_sync_logs" USING "btree" ("account_id");



CREATE INDEX "idx_amazon_sync_logs_started_at" ON "public"."amazon_sync_logs" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_amazon_sync_logs_user_id" ON "public"."amazon_sync_logs" USING "btree" ("user_id");



CREATE INDEX "idx_amazon_transactions_account" ON "public"."amazon_transactions" USING "btree" ("amazon_account_id");



CREATE INDEX "idx_amazon_transactions_delivery_date" ON "public"."amazon_transactions" USING "btree" ("delivery_date");



CREATE INDEX "idx_amazon_transactions_transaction_date" ON "public"."amazon_transactions" USING "btree" ("transaction_date");



CREATE INDEX "idx_bank_accounts_encrypted_tokens" ON "public"."bank_accounts" USING "btree" ("user_id", "encrypted_access_token") WHERE ("encrypted_access_token" IS NOT NULL);



CREATE INDEX "idx_bank_accounts_user_active" ON "public"."bank_accounts" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_bank_accounts_user_id" ON "public"."bank_accounts" USING "btree" ("user_id");



CREATE INDEX "idx_bank_transactions_account_id" ON "public"."bank_transactions" USING "btree" ("bank_account_id");



CREATE INDEX "idx_bank_transactions_archived" ON "public"."bank_transactions" USING "btree" ("archived");



CREATE INDEX "idx_bank_transactions_credit_card_id" ON "public"."bank_transactions" USING "btree" ("credit_card_id");



CREATE INDEX "idx_bank_transactions_date" ON "public"."bank_transactions" USING "btree" ("date" DESC);



CREATE INDEX "idx_bank_transactions_user_id" ON "public"."bank_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_cash_flow_insights_user_date" ON "public"."cash_flow_insights" USING "btree" ("user_id", "insight_date" DESC);



CREATE INDEX "idx_credit_card_payments_account_id" ON "public"."credit_card_payments" USING "btree" ("account_id");



CREATE INDEX "idx_credit_card_payments_credit_card_id" ON "public"."credit_card_payments" USING "btree" ("credit_card_id");



CREATE INDEX "idx_credit_card_payments_payment_date" ON "public"."credit_card_payments" USING "btree" ("payment_date");



CREATE INDEX "idx_credit_card_payments_user_id" ON "public"."credit_card_payments" USING "btree" ("user_id");



CREATE INDEX "idx_custom_discount_codes_active" ON "public"."custom_discount_codes" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_custom_discount_codes_code" ON "public"."custom_discount_codes" USING "btree" ("code");



CREATE INDEX "idx_daily_draws_account" ON "public"."amazon_daily_draws" USING "btree" ("amazon_account_id");



CREATE INDEX "idx_daily_draws_date" ON "public"."amazon_daily_draws" USING "btree" ("draw_date");



CREATE INDEX "idx_daily_draws_settlement" ON "public"."amazon_daily_draws" USING "btree" ("settlement_id");



CREATE INDEX "idx_daily_rollups_account_date" ON "public"."amazon_daily_rollups" USING "btree" ("amazon_account_id", "rollup_date" DESC);



CREATE INDEX "idx_daily_rollups_account_id" ON "public"."amazon_daily_rollups" USING "btree" ("account_id");



CREATE INDEX "idx_daily_rollups_user_date" ON "public"."amazon_daily_rollups" USING "btree" ("user_id", "rollup_date" DESC);



CREATE INDEX "idx_deleted_transactions_deleted_at" ON "public"."deleted_transactions" USING "btree" ("deleted_at" DESC);



CREATE INDEX "idx_deleted_transactions_user_id" ON "public"."deleted_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_forecast_accuracy_created_at" ON "public"."forecast_accuracy_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_forecast_accuracy_date" ON "public"."forecast_accuracy_log" USING "btree" ("payout_date" DESC);



CREATE INDEX "idx_forecast_accuracy_modeling_method" ON "public"."forecast_accuracy_log" USING "btree" ("modeling_method");



CREATE INDEX "idx_forecast_accuracy_payout_date" ON "public"."forecast_accuracy_log" USING "btree" ("payout_date" DESC);



CREATE INDEX "idx_forecast_accuracy_user_id" ON "public"."forecast_accuracy_log" USING "btree" ("user_id");



CREATE INDEX "idx_income_archived" ON "public"."income" USING "btree" ("archived", "user_id");



CREATE INDEX "idx_income_customer_id" ON "public"."income" USING "btree" ("customer_id");



CREATE INDEX "idx_income_payment_date" ON "public"."income" USING "btree" ("payment_date");



CREATE INDEX "idx_income_status" ON "public"."income" USING "btree" ("status");



CREATE INDEX "idx_income_user_id" ON "public"."income" USING "btree" ("user_id");



CREATE INDEX "idx_line_items_document_id" ON "public"."purchase_order_line_items" USING "btree" ("document_id");



CREATE INDEX "idx_line_items_user_id" ON "public"."purchase_order_line_items" USING "btree" ("user_id");



CREATE INDEX "idx_line_items_vendor_id" ON "public"."purchase_order_line_items" USING "btree" ("vendor_id");



CREATE INDEX "idx_monthly_support_metrics_month" ON "public"."monthly_support_metrics" USING "btree" ("month_year");



CREATE INDEX "idx_password_reset_tokens_expires" ON "public"."password_reset_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_password_reset_tokens_token" ON "public"."password_reset_tokens" USING "btree" ("token");



CREATE INDEX "idx_payees_account_id" ON "public"."payees" USING "btree" ("account_id");



CREATE INDEX "idx_payees_user_id" ON "public"."payees" USING "btree" ("user_id");



CREATE INDEX "idx_plan_override_audit_created_at" ON "public"."plan_override_audit" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_plan_override_audit_user_id" ON "public"."plan_override_audit" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_account_id" ON "public"."profiles" USING "btree" ("account_id");



CREATE INDEX "idx_profiles_account_status" ON "public"."profiles" USING "btree" ("account_status");



CREATE INDEX "idx_profiles_churn_date" ON "public"."profiles" USING "btree" ("churn_date");



CREATE INDEX "idx_profiles_currency" ON "public"."profiles" USING "btree" ("currency");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_hear_about_us" ON "public"."profiles" USING "btree" ("hear_about_us");



CREATE INDEX "idx_profiles_monthly_amazon_revenue" ON "public"."profiles" USING "btree" ("monthly_amazon_revenue");



CREATE INDEX "idx_profiles_my_referral_code" ON "public"."profiles" USING "btree" ("my_referral_code");



CREATE INDEX "idx_profiles_plan_override" ON "public"."profiles" USING "btree" ("plan_override") WHERE ("plan_override" IS NOT NULL);



CREATE INDEX "idx_profiles_referral_code" ON "public"."profiles" USING "btree" ("referral_code");



CREATE INDEX "idx_profiles_stripe_customer_id" ON "public"."profiles" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_purchased_addons_type" ON "public"."purchased_addons" USING "btree" ("addon_type");



CREATE INDEX "idx_purchased_addons_user_account" ON "public"."purchased_addons" USING "btree" ("user_id", "account_id");



CREATE INDEX "idx_recurring_expense_exceptions_exception_date" ON "public"."recurring_expense_exceptions" USING "btree" ("exception_date");



CREATE INDEX "idx_recurring_expense_exceptions_recurring_expense_id" ON "public"."recurring_expense_exceptions" USING "btree" ("recurring_expense_id");



CREATE INDEX "idx_recurring_expenses_credit_card_id" ON "public"."recurring_expenses" USING "btree" ("credit_card_id");



CREATE INDEX "idx_referral_codes_active" ON "public"."referral_codes" USING "btree" ("is_active");



CREATE INDEX "idx_referral_codes_code" ON "public"."referral_codes" USING "btree" ("code");



CREATE INDEX "idx_referral_codes_owner" ON "public"."referral_codes" USING "btree" ("owner_id");



CREATE INDEX "idx_referral_codes_usage" ON "public"."referral_codes" USING "btree" ("code", "is_active", "max_uses", "current_uses");



CREATE INDEX "idx_referral_rewards_user" ON "public"."referral_rewards" USING "btree" ("user_id");



CREATE INDEX "idx_referrals_referred" ON "public"."referrals" USING "btree" ("referred_user_id");



CREATE INDEX "idx_referrals_referrer" ON "public"."referrals" USING "btree" ("referrer_id");



CREATE INDEX "idx_referrals_referrer_status" ON "public"."referrals" USING "btree" ("referrer_id", "status");



CREATE INDEX "idx_scenarios_user_id" ON "public"."scenarios" USING "btree" ("user_id");



CREATE INDEX "idx_stripe_audit_log_created_at" ON "public"."stripe_customer_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_stripe_audit_log_user_id" ON "public"."stripe_customer_audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_support_tickets_admin_viewed" ON "public"."support_tickets" USING "btree" ("id", "admin_last_viewed_at");



CREATE INDEX "idx_support_tickets_assigned_to" ON "public"."support_tickets" USING "btree" ("assigned_to");



CREATE INDEX "idx_support_tickets_status" ON "public"."support_tickets" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_support_tickets_ticket_number" ON "public"."support_tickets" USING "btree" ("ticket_number");



CREATE INDEX "idx_support_tickets_user_id" ON "public"."support_tickets" USING "btree" ("user_id");



CREATE INDEX "idx_team_invitations_email" ON "public"."team_invitations" USING "btree" ("email");



CREATE INDEX "idx_team_invitations_token" ON "public"."team_invitations" USING "btree" ("token");



CREATE INDEX "idx_ticket_feedback_staff_id" ON "public"."ticket_feedback" USING "btree" ("staff_id");



CREATE INDEX "idx_ticket_feedback_ticket_id" ON "public"."ticket_feedback" USING "btree" ("ticket_id");



CREATE INDEX "idx_ticket_messages_ticket_id" ON "public"."ticket_messages" USING "btree" ("ticket_id");



CREATE INDEX "idx_ticket_messages_ticket_user_created" ON "public"."ticket_messages" USING "btree" ("ticket_id", "user_id", "created_at");



CREATE INDEX "idx_transactions_archived" ON "public"."transactions" USING "btree" ("archived", "user_id");



CREATE INDEX "idx_transactions_credit_card_id" ON "public"."transactions" USING "btree" ("credit_card_id");



CREATE INDEX "idx_trial_addon_usage_user_id" ON "public"."trial_addon_usage" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_unique_active_seller_id" ON "public"."amazon_accounts" USING "btree" ("seller_id") WHERE ("is_active" = true);



CREATE INDEX "idx_user_roles_account_id" ON "public"."user_roles" USING "btree" ("account_id");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_user_settings_advanced_modeling" ON "public"."user_settings" USING "btree" ("user_id", "advanced_modeling_enabled") WHERE ("advanced_modeling_enabled" = true);



CREATE INDEX "idx_user_settings_reserve_updated" ON "public"."user_settings" USING "btree" ("reserve_last_updated_at");



CREATE INDEX "idx_user_settings_user_id" ON "public"."user_settings" USING "btree" ("user_id");



CREATE UNIQUE INDEX "recurring_expenses_user_name_unique" ON "public"."recurring_expenses" USING "btree" ("user_id", "lower"("name"));



CREATE UNIQUE INDEX "unique_forecasted_payout_per_account_date" ON "public"."amazon_payouts" USING "btree" ("amazon_account_id", "payout_date", "status") WHERE ("status" = 'forecasted'::"text");



CREATE UNIQUE INDEX "unique_vendor_name_per_user" ON "public"."vendors" USING "btree" ("user_id", "lower"("name"));



CREATE UNIQUE INDEX "user_roles_user_account_unique" ON "public"."user_roles" USING "btree" ("user_id", COALESCE("account_id", '00000000-0000-0000-0000-000000000000'::"uuid"));



CREATE UNIQUE INDEX "user_roles_user_id_account_id_unique" ON "public"."user_roles" USING "btree" ("user_id", "account_id") WHERE ("account_id" IS NOT NULL);



CREATE UNIQUE INDEX "vendors_user_name_unique" ON "public"."vendors" USING "btree" ("user_id", "lower"("name"));



CREATE OR REPLACE TRIGGER "check_seller_uniqueness" BEFORE INSERT OR UPDATE ON "public"."amazon_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."validate_amazon_seller_uniqueness"();



CREATE OR REPLACE TRIGGER "create_default_categories_trigger" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_categories"();



CREATE OR REPLACE TRIGGER "handle_affiliate_referral_churn" AFTER UPDATE ON "public"."affiliate_referrals" FOR EACH ROW EXECUTE FUNCTION "public"."handle_affiliate_churn"();



CREATE OR REPLACE TRIGGER "log_amazon_duplicate_attempts" BEFORE INSERT OR UPDATE ON "public"."amazon_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."log_duplicate_amazon_attempt"();



CREATE OR REPLACE TRIGGER "log_recurring_expense_access_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."recurring_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."log_recurring_expense_access"();



CREATE OR REPLACE TRIGGER "notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_notification_preferences_updated_at"();



CREATE OR REPLACE TRIGGER "on_new_user_role" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_role"();



CREATE OR REPLACE TRIGGER "on_profile_created_assign_role" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_role"();



CREATE OR REPLACE TRIGGER "on_referral_created" BEFORE INSERT ON "public"."referrals" FOR EACH ROW EXECUTE FUNCTION "public"."apply_referred_user_discount"();



CREATE OR REPLACE TRIGGER "prevent_amazon_account_changes" BEFORE UPDATE ON "public"."amazon_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_unauthorized_account_changes"();



CREATE OR REPLACE TRIGGER "set_amazon_accounts_account_id" BEFORE INSERT ON "public"."amazon_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_amazon_payouts_account_id" BEFORE INSERT ON "public"."amazon_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_bank_accounts_account_id" BEFORE INSERT ON "public"."bank_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_bank_transactions_account_id" BEFORE INSERT ON "public"."bank_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_cash_flow_events_account_id" BEFORE INSERT ON "public"."cash_flow_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_cash_flow_insights_account_id" BEFORE INSERT ON "public"."cash_flow_insights" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_categories_account_id" BEFORE INSERT ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_credit_cards_account_id" BEFORE INSERT ON "public"."credit_cards" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_customers_account_id" BEFORE INSERT ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_documents_metadata_account_id" BEFORE INSERT ON "public"."documents_metadata" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_income_account_id" BEFORE INSERT ON "public"."income" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_notification_history_account_id" BEFORE INSERT ON "public"."notification_history" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_notification_preferences_account_id" BEFORE INSERT ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_recurring_expenses_account_id" BEFORE INSERT ON "public"."recurring_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_scenarios_account_id" BEFORE INSERT ON "public"."scenarios" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_transactions_account_id" BEFORE INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "set_vendors_account_id" BEFORE INSERT ON "public"."vendors" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_id_from_user"();



CREATE OR REPLACE TRIGGER "sync_amazon_accounts_user_id" BEFORE INSERT OR UPDATE OF "account_id" ON "public"."amazon_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_id_with_account"();



CREATE OR REPLACE TRIGGER "sync_amazon_daily_draws_user_id" BEFORE INSERT OR UPDATE OF "account_id" ON "public"."amazon_daily_draws" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_id_with_account"();



CREATE OR REPLACE TRIGGER "sync_amazon_daily_rollups_user_id" BEFORE INSERT OR UPDATE OF "account_id" ON "public"."amazon_daily_rollups" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_id_with_account"();



CREATE OR REPLACE TRIGGER "sync_amazon_payouts_user_id" BEFORE INSERT OR UPDATE OF "account_id" ON "public"."amazon_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_id_with_account"();



CREATE OR REPLACE TRIGGER "sync_amazon_transactions_user_id" BEFORE INSERT OR UPDATE OF "account_id" ON "public"."amazon_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_id_with_account"();



CREATE OR REPLACE TRIGGER "trigger_notify_customer_closed" AFTER UPDATE ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."notify_customer_on_ticket_closed"();



CREATE OR REPLACE TRIGGER "trigger_notify_customer_response" AFTER INSERT ON "public"."ticket_messages" FOR EACH ROW EXECUTE FUNCTION "public"."notify_customer_on_staff_response"();



CREATE OR REPLACE TRIGGER "trigger_update_balance_on_transaction" AFTER INSERT OR DELETE OR UPDATE ON "public"."bank_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_bank_account_balance"();



CREATE OR REPLACE TRIGGER "trigger_update_bank_balance_on_delete" AFTER DELETE ON "public"."bank_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_bank_balance_on_transaction_change"();



CREATE OR REPLACE TRIGGER "trigger_update_bank_balance_on_insert" AFTER INSERT ON "public"."bank_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_bank_balance_on_transaction_change"();



CREATE OR REPLACE TRIGGER "trigger_update_bank_balance_on_update" AFTER UPDATE ON "public"."bank_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_bank_balance_on_transaction_change"();



CREATE OR REPLACE TRIGGER "trigger_update_credit_card_balance_on_delete" AFTER DELETE ON "public"."bank_transactions" FOR EACH ROW WHEN (("old"."credit_card_id" IS NOT NULL)) EXECUTE FUNCTION "public"."update_credit_card_balance_on_transaction_change"();



CREATE OR REPLACE TRIGGER "trigger_update_credit_card_balance_on_insert" AFTER INSERT ON "public"."bank_transactions" FOR EACH ROW WHEN (("new"."credit_card_id" IS NOT NULL)) EXECUTE FUNCTION "public"."update_credit_card_balance_on_transaction_change"();



CREATE OR REPLACE TRIGGER "trigger_update_credit_card_balance_on_update" AFTER UPDATE ON "public"."bank_transactions" FOR EACH ROW WHEN (("new"."credit_card_id" IS NOT NULL)) EXECUTE FUNCTION "public"."update_credit_card_balance_on_transaction_change"();



CREATE OR REPLACE TRIGGER "trigger_update_referral_rewards" AFTER INSERT OR UPDATE OF "status" ON "public"."referrals" FOR EACH ROW EXECUTE FUNCTION "public"."update_referral_rewards"();



CREATE OR REPLACE TRIGGER "update_admin_permissions_updated_at" BEFORE UPDATE ON "public"."admin_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_affiliate_payouts_updated_at" BEFORE UPDATE ON "public"."affiliate_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_affiliate_referrals_updated_at" BEFORE UPDATE ON "public"."affiliate_referrals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_affiliate_tier_on_referral" AFTER INSERT OR DELETE OR UPDATE ON "public"."affiliate_referrals" FOR EACH ROW EXECUTE FUNCTION "public"."update_affiliate_tier"();



CREATE OR REPLACE TRIGGER "update_affiliates_updated_at" BEFORE UPDATE ON "public"."affiliates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_amazon_accounts_updated_at" BEFORE UPDATE ON "public"."amazon_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_amazon_daily_draws_updated_at" BEFORE UPDATE ON "public"."amazon_daily_draws" FOR EACH ROW EXECUTE FUNCTION "public"."update_amazon_daily_draws_updated_at"();



CREATE OR REPLACE TRIGGER "update_amazon_payouts_updated_at" BEFORE UPDATE ON "public"."amazon_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bank_accounts_updated_at" BEFORE UPDATE ON "public"."bank_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_bank_accounts_updated_at"();



CREATE OR REPLACE TRIGGER "update_cash_flow_events_updated_at" BEFORE UPDATE ON "public"."cash_flow_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cash_flow_insights_updated_at" BEFORE UPDATE ON "public"."cash_flow_insights" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_commission_on_tier_change" BEFORE UPDATE OF "tier" ON "public"."affiliates" FOR EACH ROW WHEN (("old"."tier" IS DISTINCT FROM "new"."tier")) EXECUTE FUNCTION "public"."update_affiliate_commission_rate"();



CREATE OR REPLACE TRIGGER "update_credit_card_payments_updated_at" BEFORE UPDATE ON "public"."credit_card_payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_credit_cards_updated_at" BEFORE UPDATE ON "public"."credit_cards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_custom_discount_codes_updated_at" BEFORE UPDATE ON "public"."custom_discount_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_daily_rollups_updated_at" BEFORE UPDATE ON "public"."amazon_daily_rollups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_documents_metadata_updated_at" BEFORE UPDATE ON "public"."documents_metadata" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_feature_requests_updated_at" BEFORE UPDATE ON "public"."feature_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_forecast_accuracy_log_updated_at" BEFORE UPDATE ON "public"."forecast_accuracy_log" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_income_updated_at" BEFORE UPDATE ON "public"."income" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payees_updated_at" BEFORE UPDATE ON "public"."payees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_purchased_addons_updated_at" BEFORE UPDATE ON "public"."purchased_addons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_recurring_expenses_updated_at" BEFORE UPDATE ON "public"."recurring_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_referral_codes_updated_at" BEFORE UPDATE ON "public"."referral_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_referral_rewards_updated_at" BEFORE UPDATE ON "public"."referral_rewards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_referrals_updated_at" BEFORE UPDATE ON "public"."referrals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_scenarios_updated_at" BEFORE UPDATE ON "public"."scenarios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_support_tickets_updated_at" BEFORE UPDATE ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ticket_feedback_updated_at" BEFORE UPDATE ON "public"."ticket_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ticket_status_on_message_trigger" AFTER INSERT ON "public"."ticket_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_ticket_status_on_message"();



CREATE OR REPLACE TRIGGER "update_transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_trial_addon_usage_updated_at" BEFORE UPDATE ON "public"."trial_addon_usage" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_vendors_updated_at" BEFORE UPDATE ON "public"."vendors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_recurring_expense_account_id_trigger" BEFORE INSERT OR UPDATE ON "public"."recurring_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."validate_recurring_expense_account_id"();



ALTER TABLE ONLY "public"."account_modification_audit"
    ADD CONSTRAINT "account_modification_audit_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."affiliate_payouts"
    ADD CONSTRAINT "affiliate_payouts_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."affiliate_referrals"
    ADD CONSTRAINT "affiliate_referrals_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."affiliate_referrals"
    ADD CONSTRAINT "affiliate_referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."amazon_connection_audit"
    ADD CONSTRAINT "amazon_connection_audit_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."amazon_daily_draws"
    ADD CONSTRAINT "amazon_daily_draws_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."amazon_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."amazon_daily_draws"
    ADD CONSTRAINT "amazon_daily_draws_amazon_account_id_fkey" FOREIGN KEY ("amazon_account_id") REFERENCES "public"."amazon_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."amazon_daily_rollups"
    ADD CONSTRAINT "amazon_daily_rollups_amazon_account_id_fkey" FOREIGN KEY ("amazon_account_id") REFERENCES "public"."amazon_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."amazon_payouts"
    ADD CONSTRAINT "amazon_payouts_amazon_account_id_fkey" FOREIGN KEY ("amazon_account_id") REFERENCES "public"."amazon_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."amazon_sync_logs"
    ADD CONSTRAINT "amazon_sync_logs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."amazon_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_transactions"
    ADD CONSTRAINT "bank_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_transactions"
    ADD CONSTRAINT "bank_transactions_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_flow_events"
    ADD CONSTRAINT "cash_flow_events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."cash_flow_events"
    ADD CONSTRAINT "cash_flow_events_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."credit_card_payments"
    ADD CONSTRAINT "credit_card_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_card_payments"
    ADD CONSTRAINT "credit_card_payments_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_discount_codes"
    ADD CONSTRAINT "custom_discount_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."documents_metadata"
    ADD CONSTRAINT "documents_metadata_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents_metadata"
    ADD CONSTRAINT "documents_metadata_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feature_requests"
    ADD CONSTRAINT "feature_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."income"
    ADD CONSTRAINT "fk_income_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forecast_accuracy_log"
    ADD CONSTRAINT "forecast_accuracy_log_amazon_account_id_fkey" FOREIGN KEY ("amazon_account_id") REFERENCES "public"."amazon_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forecast_accuracy_log"
    ADD CONSTRAINT "forecast_accuracy_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."income"
    ADD CONSTRAINT "income_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_history"
    ADD CONSTRAINT "notification_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order_line_items"
    ADD CONSTRAINT "purchase_order_line_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents_metadata"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order_line_items"
    ADD CONSTRAINT "purchase_order_line_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchased_addons"
    ADD CONSTRAINT "purchased_addons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_expense_exceptions"
    ADD CONSTRAINT "recurring_expense_exceptions_recurring_expense_id_fkey" FOREIGN KEY ("recurring_expense_id") REFERENCES "public"."recurring_expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_expense_exceptions"
    ADD CONSTRAINT "recurring_expense_exceptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_expenses"
    ADD CONSTRAINT "recurring_expenses_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral_rewards"
    ADD CONSTRAINT "referral_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stripe_customer_audit_log"
    ADD CONSTRAINT "stripe_customer_audit_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stripe_customer_audit_log"
    ADD CONSTRAINT "stripe_customer_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_claimed_by_fkey" FOREIGN KEY ("claimed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_feedback"
    ADD CONSTRAINT "ticket_feedback_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."trial_addon_usage"
    ADD CONSTRAINT "trial_addon_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Account admins can create invitations" ON "public"."team_invitations" FOR INSERT WITH CHECK ("public"."is_account_admin"("auth"."uid"(), "account_id"));



CREATE POLICY "Account admins can delete invitations" ON "public"."team_invitations" FOR DELETE USING ("public"."is_account_admin"("auth"."uid"(), "account_id"));



CREATE POLICY "Account admins can delete roles" ON "public"."user_roles" FOR DELETE USING ("public"."is_account_admin"("auth"."uid"(), "account_id"));



CREATE POLICY "Account admins can insert roles" ON "public"."user_roles" FOR INSERT WITH CHECK ("public"."is_account_admin"("auth"."uid"(), "account_id"));



CREATE POLICY "Account admins can update invitations" ON "public"."team_invitations" FOR UPDATE USING ("public"."is_account_admin"("auth"."uid"(), "account_id"));



CREATE POLICY "Account admins can update roles" ON "public"."user_roles" FOR UPDATE USING ("public"."is_account_admin"("auth"."uid"(), "account_id"));



CREATE POLICY "Account members can create Amazon accounts" ON "public"."amazon_accounts" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create bank accounts" ON "public"."bank_accounts" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create bank transactions" ON "public"."bank_transactions" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create cash flow events" ON "public"."cash_flow_events" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create categories" ON "public"."categories" FOR INSERT WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create credit card payments" ON "public"."credit_card_payments" FOR INSERT WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create credit cards" ON "public"."credit_cards" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create customers" ON "public"."customers" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create daily draws" ON "public"."amazon_daily_draws" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."account_id" = "amazon_daily_draws"."account_id")))));



CREATE POLICY "Account members can create documents" ON "public"."documents_metadata" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create exceptions" ON "public"."recurring_expense_exceptions" FOR INSERT WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create income" ON "public"."income" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create insights" ON "public"."cash_flow_insights" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create notification history" ON "public"."notification_history" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create notification preferences" ON "public"."notification_preferences" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create payees" ON "public"."payees" FOR INSERT WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create purchased addons" ON "public"."purchased_addons" FOR INSERT WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create recurring expenses" ON "public"."recurring_expenses" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create scenarios" ON "public"."scenarios" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create settings" ON "public"."user_settings" FOR INSERT TO "authenticated" WITH CHECK (("account_id" IN ( SELECT "profiles"."account_id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Account members can create transactions" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can create vendors" ON "public"."vendors" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete Amazon accounts" ON "public"."amazon_accounts" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete bank accounts" ON "public"."bank_accounts" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete bank transactions" ON "public"."bank_transactions" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete cash flow events" ON "public"."cash_flow_events" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete categories" ON "public"."categories" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete credit card payments" ON "public"."credit_card_payments" FOR DELETE USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete credit cards" ON "public"."credit_cards" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete customers" ON "public"."customers" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete daily draws" ON "public"."amazon_daily_draws" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."account_id" = "amazon_daily_draws"."account_id")))));



CREATE POLICY "Account members can delete documents" ON "public"."documents_metadata" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete exceptions" ON "public"."recurring_expense_exceptions" FOR DELETE USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete income" ON "public"."income" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete notification history" ON "public"."notification_history" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete notification preferences" ON "public"."notification_preferences" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete payees" ON "public"."payees" FOR DELETE USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete recurring expenses" ON "public"."recurring_expenses" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete scenarios" ON "public"."scenarios" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete transactions" ON "public"."transactions" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can delete vendors" ON "public"."vendors" FOR DELETE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update Amazon accounts" ON "public"."amazon_accounts" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update bank accounts" ON "public"."bank_accounts" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update bank transactions" ON "public"."bank_transactions" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update cash flow events" ON "public"."cash_flow_events" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update categories" ON "public"."categories" FOR UPDATE USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update credit card payments" ON "public"."credit_card_payments" FOR UPDATE USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update credit cards" ON "public"."credit_cards" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update customers" ON "public"."customers" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update daily draws" ON "public"."amazon_daily_draws" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."account_id" = "amazon_daily_draws"."account_id")))));



CREATE POLICY "Account members can update documents" ON "public"."documents_metadata" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update income" ON "public"."income" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update insights" ON "public"."cash_flow_insights" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update notification history" ON "public"."notification_history" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update notification preferences" ON "public"."notification_preferences" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update payees" ON "public"."payees" FOR UPDATE USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update recurring expenses" ON "public"."recurring_expenses" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update scenarios" ON "public"."scenarios" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update settings" ON "public"."user_settings" FOR UPDATE TO "authenticated" USING (("account_id" IN ( SELECT "profiles"."account_id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())))) WITH CHECK (("account_id" IN ( SELECT "profiles"."account_id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Account members can update transactions" ON "public"."transactions" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can update vendors" ON "public"."vendors" FOR UPDATE TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view Amazon accounts" ON "public"."amazon_accounts" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view bank accounts" ON "public"."bank_accounts" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view bank transactions" ON "public"."bank_transactions" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view cash flow events" ON "public"."cash_flow_events" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view categories" ON "public"."categories" FOR SELECT USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view credit card payments" ON "public"."credit_card_payments" FOR SELECT USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view credit cards" ON "public"."credit_cards" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view customers" ON "public"."customers" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view daily draws" ON "public"."amazon_daily_draws" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."account_id" = "amazon_daily_draws"."account_id")))));



CREATE POLICY "Account members can view documents" ON "public"."documents_metadata" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view exceptions" ON "public"."recurring_expense_exceptions" FOR SELECT USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view income" ON "public"."income" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view insights" ON "public"."cash_flow_insights" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view notification history" ON "public"."notification_history" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view notification preferences" ON "public"."notification_preferences" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view payees" ON "public"."payees" FOR SELECT USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view recurring expenses" ON "public"."recurring_expenses" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view scenarios" ON "public"."scenarios" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view settings" ON "public"."user_settings" FOR SELECT TO "authenticated" USING (("account_id" IN ( SELECT "profiles"."account_id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Account members can view their purchased addons" ON "public"."purchased_addons" FOR SELECT USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Account members can view vendors" ON "public"."vendors" FOR SELECT TO "authenticated" USING ("public"."user_belongs_to_account"("account_id"));



CREATE POLICY "Admins and website admin can view all logs" ON "public"."forecast_accuracy_log" FOR SELECT TO "authenticated" USING (("public"."is_website_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can create ticket messages" ON "public"."ticket_messages" FOR INSERT WITH CHECK ("public"."is_admin_staff"());



CREATE POLICY "Admins can delete referral codes" ON "public"."referral_codes" FOR DELETE USING (("public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Admins can delete support tickets" ON "public"."support_tickets" FOR DELETE USING ("public"."is_admin_staff"());



CREATE POLICY "Admins can insert referral codes" ON "public"."referral_codes" FOR INSERT WITH CHECK (("public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Admins can insert stripe audit log" ON "public"."stripe_customer_audit_log" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_website_admin"());



CREATE POLICY "Admins can manage all affiliate referrals" ON "public"."affiliate_referrals" USING ("public"."is_website_admin"()) WITH CHECK ("public"."is_website_admin"());



CREATE POLICY "Admins can manage all referrals" ON "public"."referrals" USING ("public"."is_website_admin"()) WITH CHECK ("public"."is_website_admin"());



CREATE POLICY "Admins can manage all sync logs" ON "public"."amazon_sync_logs" USING ("public"."is_website_admin"()) WITH CHECK ("public"."is_website_admin"());



CREATE POLICY "Admins can manage custom discount codes" ON "public"."custom_discount_codes" USING (("public"."is_website_admin"() OR "public"."has_admin_role"("auth"."uid"()))) WITH CHECK (("public"."is_website_admin"() OR "public"."has_admin_role"("auth"."uid"())));



CREATE POLICY "Admins can update all affiliates" ON "public"."affiliates" FOR UPDATE USING (("public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Admins can update all feature requests" ON "public"."feature_requests" FOR UPDATE USING ("public"."has_admin_role"("auth"."uid"()));



CREATE POLICY "Admins can update all support tickets" ON "public"."support_tickets" FOR UPDATE USING ("public"."is_admin_staff"());



CREATE POLICY "Admins can update referral codes" ON "public"."referral_codes" FOR UPDATE USING (("public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"())) WITH CHECK (("public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Admins can view Amazon connection audit" ON "public"."amazon_connection_audit" FOR SELECT TO "authenticated" USING (("public"."is_website_admin"() OR "public"."has_admin_role"("auth"."uid"())));



CREATE POLICY "Admins can view account modification audit" ON "public"."account_modification_audit" FOR SELECT TO "authenticated" USING (("public"."is_website_admin"() OR "public"."has_admin_role"("auth"."uid"())));



CREATE POLICY "Admins can view all Amazon payouts" ON "public"."amazon_payouts" FOR SELECT TO "authenticated" USING (("public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Admins can view all affiliates" ON "public"."affiliates" FOR SELECT USING (("public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Admins can view all feature requests" ON "public"."feature_requests" FOR SELECT USING ("public"."has_admin_role"("auth"."uid"()));



CREATE POLICY "Admins can view all feedback" ON "public"."ticket_feedback" FOR SELECT USING ("public"."is_admin_staff"());



CREATE POLICY "Admins can view all payouts" ON "public"."affiliate_payouts" FOR SELECT USING (("public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."has_admin_role"("auth"."uid"()));



CREATE POLICY "Admins can view all referral codes" ON "public"."referral_codes" FOR SELECT USING (("public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Admins can view all referral rewards" ON "public"."referral_rewards" FOR SELECT USING (("public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Admins can view all referrals" ON "public"."referrals" FOR SELECT USING (("public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Admins can view all support tickets" ON "public"."support_tickets" FOR SELECT USING ("public"."is_admin_staff"());



CREATE POLICY "Admins can view all ticket messages" ON "public"."ticket_messages" FOR SELECT USING ("public"."is_admin_staff"());



CREATE POLICY "Admins can view audit logs" ON "public"."audit_logs" FOR SELECT USING (("public"."is_website_admin"() OR "public"."has_admin_role"("auth"."uid"())));



CREATE POLICY "Admins can view monthly support metrics" ON "public"."monthly_support_metrics" FOR SELECT USING (("public"."is_website_admin"() OR "public"."has_admin_role"("auth"."uid"())));



CREATE POLICY "Admins can view stripe audit log" ON "public"."stripe_customer_audit_log" FOR SELECT TO "authenticated" USING ("public"."is_website_admin"());



CREATE POLICY "Admins can view sync logs" ON "public"."bank_sync_logs" FOR SELECT USING (("public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Affiliates can view their own referrals" ON "public"."affiliate_referrals" FOR SELECT USING ((("affiliate_id" IN ( SELECT "affiliates"."id"
   FROM "public"."affiliates"
  WHERE ("affiliates"."user_id" = "auth"."uid"()))) OR "public"."is_website_admin"()));



CREATE POLICY "Affiliates can view their payouts" ON "public"."affiliate_payouts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."affiliates"
  WHERE (("affiliates"."id" = "affiliate_payouts"."affiliate_id") AND ("affiliates"."user_id" = "auth"."uid"())))));



CREATE POLICY "Affiliates can view their referrals" ON "public"."affiliate_referrals" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."affiliates"
  WHERE (("affiliates"."id" = "affiliate_referrals"."affiliate_id") AND ("affiliates"."user_id" = "auth"."uid"())))) OR "public"."has_admin_role"("auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Allow anon to read referral codes for validation" ON "public"."profiles" FOR SELECT TO "anon" USING (("my_referral_code" IS NOT NULL));



CREATE POLICY "Allow public to validate active referral codes" ON "public"."referral_codes" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Allow public token validation" ON "public"."admin_permissions" FOR SELECT TO "anon" USING ((("invitation_token" IS NOT NULL) AND ("account_created" = false) AND ("token_expires_at" > "now"())));



CREATE POLICY "Authenticated users can view plan limits" ON "public"."plan_limits" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "No direct access to reset tokens" ON "public"."password_reset_tokens" USING (false);



CREATE POLICY "Only admins can modify plan limits" ON "public"."plan_limits" USING ("public"."is_website_admin"()) WITH CHECK ("public"."is_website_admin"());



CREATE POLICY "System can create referrals" ON "public"."referrals" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can create sync logs" ON "public"."amazon_sync_logs" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "System can insert forecast accuracy logs" ON "public"."forecast_accuracy_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert monthly support metrics" ON "public"."monthly_support_metrics" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert plan override audit logs" ON "public"."plan_override_audit" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert sync logs" ON "public"."amazon_sync_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can manage affiliate referrals" ON "public"."affiliate_referrals" USING (true) WITH CHECK (true);



CREATE POLICY "System can manage rewards" ON "public"."referral_rewards" USING ("public"."is_website_admin"()) WITH CHECK ("public"."is_website_admin"());



CREATE POLICY "System can update referrals" ON "public"."referrals" FOR UPDATE USING (true);



CREATE POLICY "System can update sync logs" ON "public"."amazon_sync_logs" FOR UPDATE USING (true);



CREATE POLICY "Users can create feature requests" ON "public"."feature_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create messages for their tickets" ON "public"."ticket_messages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."support_tickets"
  WHERE (("support_tickets"."id" = "ticket_messages"."ticket_id") AND ("support_tickets"."user_id" = "auth"."uid"())))) AND ("auth"."uid"() = "user_id")));



CREATE POLICY "Users can create referrals" ON "public"."referrals" FOR INSERT WITH CHECK (("referred_user_id" = "auth"."uid"()));



CREATE POLICY "Users can create their Amazon payouts" ON "public"."amazon_payouts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own Amazon transactions" ON "public"."amazon_transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own affiliate profile" ON "public"."affiliates" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own feedback" ON "public"."ticket_feedback" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own support tickets" ON "public"."support_tickets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their Amazon payouts" ON "public"."amazon_payouts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own Amazon transactions" ON "public"."amazon_transactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own daily rollups" ON "public"."amazon_daily_rollups" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own deleted transactions" ON "public"."deleted_transactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own line items" ON "public"."purchase_order_line_items" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert messages on their own tickets" ON "public"."ticket_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."support_tickets"
  WHERE (("support_tickets"."id" = "ticket_messages"."ticket_id") AND ("support_tickets"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own profile only" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own daily rollups" ON "public"."amazon_daily_rollups" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own deleted transactions" ON "public"."deleted_transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own line items" ON "public"."purchase_order_line_items" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own settings" ON "public"."user_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own trial addon usage" ON "public"."trial_addon_usage" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile only" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their Amazon payouts" ON "public"."amazon_payouts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own Amazon transactions" ON "public"."amazon_transactions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own affiliate profile" ON "public"."affiliates" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own daily rollups" ON "public"."amazon_daily_rollups" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own line items" ON "public"."purchase_order_line_items" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own settings" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own support tickets" ON "public"."support_tickets" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own trial addon usage" ON "public"."trial_addon_usage" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view invitations in their account" ON "public"."team_invitations" FOR SELECT USING (("account_id" = "public"."get_user_account_id"("auth"."uid"())));



CREATE POLICY "Users can view own profile only" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view profiles in their account" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("account_id" = "public"."get_user_account_id"("auth"."uid"())));



CREATE POLICY "Users can view referrals they made" ON "public"."referrals" FOR SELECT USING (("auth"."uid"() = "referrer_id"));



CREATE POLICY "Users can view roles in their account" ON "public"."user_roles" FOR SELECT USING (("account_id" = "public"."get_user_account_id"("auth"."uid"())));



CREATE POLICY "Users can view their Amazon payouts" ON "public"."amazon_payouts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own Amazon transactions" ON "public"."amazon_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own affiliate profile" ON "public"."affiliates" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own daily rollups" ON "public"."amazon_daily_rollups" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own deleted transactions" ON "public"."deleted_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own feature requests" ON "public"."feature_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own feedback" ON "public"."ticket_feedback" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own line items" ON "public"."purchase_order_line_items" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own logs" ON "public"."forecast_accuracy_log" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own referrals" ON "public"."referrals" FOR SELECT USING ((("referrer_id" = "auth"."uid"()) OR ("referred_user_id" = "auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Users can view their own rewards" ON "public"."referral_rewards" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Users can view their own settings" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own support tickets" ON "public"."support_tickets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sync logs" ON "public"."amazon_sync_logs" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_website_admin"()));



CREATE POLICY "Users can view their own ticket messages" ON "public"."ticket_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."support_tickets"
  WHERE (("support_tickets"."id" = "ticket_messages"."ticket_id") AND ("support_tickets"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own trial addon usage" ON "public"."trial_addon_usage" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their ticket messages" ON "public"."ticket_messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."support_tickets"
  WHERE (("support_tickets"."id" = "ticket_messages"."ticket_id") AND ("support_tickets"."user_id" = "auth"."uid"())))) AND ("is_internal" = false)));



CREATE POLICY "Website admin can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_website_admin"());



CREATE POLICY "Website admins can delete admin permissions" ON "public"."admin_permissions" FOR DELETE TO "authenticated" USING ("public"."is_website_admin"());



CREATE POLICY "Website admins can insert messages on any ticket" ON "public"."ticket_messages" FOR INSERT WITH CHECK ("public"."is_website_admin"());



CREATE POLICY "Website admins can invite admins" ON "public"."admin_permissions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_website_admin"());



CREATE POLICY "Website admins can update admin permissions" ON "public"."admin_permissions" FOR UPDATE TO "authenticated" USING ("public"."is_website_admin"());



CREATE POLICY "Website admins can view admin permissions" ON "public"."admin_permissions" FOR SELECT TO "authenticated" USING ("public"."is_website_admin"());



CREATE POLICY "Website admins can view all ticket messages" ON "public"."ticket_messages" FOR SELECT USING ("public"."is_website_admin"());



CREATE POLICY "Website admins can view plan override audit logs" ON "public"."plan_override_audit" FOR SELECT USING (("public"."is_website_admin"() OR "public"."has_admin_role"("auth"."uid"())));



ALTER TABLE "public"."account_modification_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."affiliate_payouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."affiliate_referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."affiliates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."amazon_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."amazon_connection_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."amazon_daily_draws" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."amazon_daily_rollups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."amazon_payouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."amazon_sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."amazon_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cash_flow_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cash_flow_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_card_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_discount_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deleted_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents_metadata" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forecast_accuracy_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."income" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monthly_support_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_override_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_order_line_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchased_addons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_expense_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referral_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referral_rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scenarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_customer_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trial_addon_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."amazon_payouts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."bank_accounts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."income";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."recurring_expenses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."transactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."vendors";



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


























































































































































































GRANT ALL ON FUNCTION "public"."apply_referred_user_discount"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_referred_user_discount"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_referred_user_discount"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_bank_account_balance"("account_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_bank_account_balance"("account_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_bank_account_balance"("account_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_credit_card_balance"("card_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_credit_card_balance"("card_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_credit_card_balance"("card_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_admin_permission"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_admin_permission"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_admin_permission"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_data_consistency"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_data_consistency"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_data_consistency"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_reset_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_reset_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_reset_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_bank_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_bank_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_bank_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_income"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_income"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_income"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_user_documents"() TO "anon";
GRANT ALL ON FUNCTION "public"."clear_user_documents"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_user_documents"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_categories"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_categories"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_categories"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_banking_credential"("encrypted_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_banking_credential"("encrypted_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_banking_credential"("encrypted_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_banking_credential"("plain_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_banking_credential"("plain_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_banking_credential"("plain_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_admin_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_admin_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_admin_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_amazon_revenue_30_days"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_amazon_revenue_30_days"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_amazon_revenue_30_days"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_account_id"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_account_id"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_account_id"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_plan_limits"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_plan_limits"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_plan_limits"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_affiliate_churn"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_affiliate_churn"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_affiliate_churn"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_admin_role"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_admin_role"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_admin_role"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_account_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_account_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_account_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_affiliate_commission"("p_affiliate_id" "uuid", "p_commission_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_affiliate_commission"("p_affiliate_id" "uuid", "p_commission_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_affiliate_commission"("p_affiliate_id" "uuid", "p_commission_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_referral_code_usage"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_referral_code_usage"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_referral_code_usage"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_secure_amazon_account"("p_seller_id" "text", "p_marketplace_id" "text", "p_marketplace_name" "text", "p_account_name" "text", "p_refresh_token" "text", "p_access_token" "text", "p_client_id" "text", "p_client_secret" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_secure_amazon_account"("p_seller_id" "text", "p_marketplace_id" "text", "p_marketplace_name" "text", "p_account_name" "text", "p_refresh_token" "text", "p_access_token" "text", "p_client_id" "text", "p_client_secret" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_secure_amazon_account"("p_seller_id" "text", "p_marketplace_id" "text", "p_marketplace_name" "text", "p_account_name" "text", "p_refresh_token" "text", "p_access_token" "text", "p_client_id" "text", "p_client_secret" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_secure_bank_account"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_secure_bank_account"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_secure_bank_account"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_secure_bank_account_simple"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_secure_bank_account_simple"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_secure_bank_account_simple"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_secure_credit_card"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_interest_rate" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."insert_secure_credit_card"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_interest_rate" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_secure_credit_card"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_interest_rate" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_secure_credit_card_simple"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric, "p_priority" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."insert_secure_credit_card_simple"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric, "p_priority" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_secure_credit_card_simple"("p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric, "p_priority" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_account_admin"("_user_id" "uuid", "_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_account_admin"("_user_id" "uuid", "_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_account_admin"("_user_id" "uuid", "_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_staff"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_staff"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_website_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_website_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_website_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_duplicate_amazon_attempt"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_duplicate_amazon_attempt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_duplicate_amazon_attempt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_recurring_expense_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_recurring_expense_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_recurring_expense_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_customer_on_staff_response"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_customer_on_staff_response"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_customer_on_staff_response"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_customer_on_ticket_closed"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_customer_on_ticket_closed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_customer_on_ticket_closed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_unauthorized_account_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_unauthorized_account_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_unauthorized_account_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_account_id_from_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_account_id_from_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_account_id_from_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_id_with_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_id_with_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_id_with_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_affiliate_referral"() TO "anon";
GRANT ALL ON FUNCTION "public"."track_affiliate_referral"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_affiliate_referral"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_affiliate_commission_rate"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_affiliate_commission_rate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_affiliate_commission_rate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_affiliate_tier"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_affiliate_tier"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_affiliate_tier"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_amazon_daily_draws_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_amazon_daily_draws_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_amazon_daily_draws_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_bank_account_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_bank_account_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_bank_account_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_bank_accounts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_bank_accounts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_bank_accounts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_bank_balance_on_transaction_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_bank_balance_on_transaction_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_bank_balance_on_transaction_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_credit_card_balance_on_transaction_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_credit_card_balance_on_transaction_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_credit_card_balance_on_transaction_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notification_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notification_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notification_preferences_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_purchase_order_line_items_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_purchase_order_line_items_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_purchase_order_line_items_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_referral_rewards"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_referral_rewards"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_referral_rewards"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_secure_amazon_account"("p_account_id" "uuid", "p_account_name" "text", "p_refresh_token" "text", "p_access_token" "text", "p_client_id" "text", "p_client_secret" "text", "p_token_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."update_secure_amazon_account"("p_account_id" "uuid", "p_account_name" "text", "p_refresh_token" "text", "p_access_token" "text", "p_client_id" "text", "p_client_secret" "text", "p_token_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_secure_amazon_account"("p_account_id" "uuid", "p_account_name" "text", "p_refresh_token" "text", "p_access_token" "text", "p_client_id" "text", "p_client_secret" "text", "p_token_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_secure_bank_account"("p_account_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_secure_bank_account"("p_account_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_secure_bank_account"("p_account_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_available_balance" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_interest_rate" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_interest_rate" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_interest_rate" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric, "p_priority" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric, "p_priority" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric, "p_priority" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_statement_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric, "p_priority" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_statement_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric, "p_priority" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_secure_credit_card"("p_card_id" "uuid", "p_institution_name" "text", "p_account_name" "text", "p_account_type" "text", "p_balance" numeric, "p_statement_balance" numeric, "p_credit_limit" numeric, "p_available_credit" numeric, "p_currency_code" "text", "p_access_token" "text", "p_account_number" "text", "p_plaid_item_id" "text", "p_plaid_account_id" "text", "p_minimum_payment" numeric, "p_payment_due_date" "date", "p_statement_close_date" "date", "p_annual_fee" numeric, "p_cash_back" numeric, "p_priority" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ticket_status_on_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ticket_status_on_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ticket_status_on_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_belongs_to_account"("_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_belongs_to_account"("_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_belongs_to_account"("_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_amazon_seller_uniqueness"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_amazon_seller_uniqueness"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_amazon_seller_uniqueness"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_recurring_expense_account_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_recurring_expense_account_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_recurring_expense_account_id"() TO "service_role";












SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;


















GRANT ALL ON TABLE "public"."account_modification_audit" TO "anon";
GRANT ALL ON TABLE "public"."account_modification_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."account_modification_audit" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_expenses" TO "anon";
GRANT ALL ON TABLE "public"."recurring_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_data_visibility_issues" TO "anon";
GRANT ALL ON TABLE "public"."admin_data_visibility_issues" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_data_visibility_issues" TO "service_role";



GRANT ALL ON TABLE "public"."admin_permissions" TO "anon";
GRANT ALL ON TABLE "public"."admin_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_payouts" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_payouts" TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_referrals" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_referrals" TO "service_role";



GRANT ALL ON TABLE "public"."affiliates" TO "anon";
GRANT ALL ON TABLE "public"."affiliates" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliates" TO "service_role";



GRANT ALL ON TABLE "public"."amazon_accounts" TO "anon";
GRANT ALL ON TABLE "public"."amazon_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."amazon_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."amazon_connection_audit" TO "anon";
GRANT ALL ON TABLE "public"."amazon_connection_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."amazon_connection_audit" TO "service_role";



GRANT ALL ON TABLE "public"."amazon_daily_draws" TO "anon";
GRANT ALL ON TABLE "public"."amazon_daily_draws" TO "authenticated";
GRANT ALL ON TABLE "public"."amazon_daily_draws" TO "service_role";



GRANT ALL ON TABLE "public"."amazon_daily_rollups" TO "anon";
GRANT ALL ON TABLE "public"."amazon_daily_rollups" TO "authenticated";
GRANT ALL ON TABLE "public"."amazon_daily_rollups" TO "service_role";



GRANT ALL ON TABLE "public"."amazon_payouts" TO "anon";
GRANT ALL ON TABLE "public"."amazon_payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."amazon_payouts" TO "service_role";



GRANT ALL ON TABLE "public"."amazon_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."amazon_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."amazon_sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."amazon_transactions" TO "anon";
GRANT ALL ON TABLE "public"."amazon_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."amazon_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."bank_accounts" TO "anon";
GRANT ALL ON TABLE "public"."bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."bank_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."bank_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."bank_transactions" TO "anon";
GRANT ALL ON TABLE "public"."bank_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."cash_flow_events" TO "anon";
GRANT ALL ON TABLE "public"."cash_flow_events" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_flow_events" TO "service_role";



GRANT ALL ON TABLE "public"."cash_flow_insights" TO "anon";
GRANT ALL ON TABLE "public"."cash_flow_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_flow_insights" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."credit_card_payments" TO "anon";
GRANT ALL ON TABLE "public"."credit_card_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_card_payments" TO "service_role";



GRANT ALL ON TABLE "public"."credit_cards" TO "anon";
GRANT ALL ON TABLE "public"."credit_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_cards" TO "service_role";



GRANT ALL ON TABLE "public"."custom_discount_codes" TO "anon";
GRANT ALL ON TABLE "public"."custom_discount_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_discount_codes" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."deleted_transactions" TO "anon";
GRANT ALL ON TABLE "public"."deleted_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."deleted_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."documents_metadata" TO "anon";
GRANT ALL ON TABLE "public"."documents_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."documents_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."feature_requests" TO "anon";
GRANT ALL ON TABLE "public"."feature_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_requests" TO "service_role";



GRANT ALL ON TABLE "public"."forecast_accuracy_log" TO "anon";
GRANT ALL ON TABLE "public"."forecast_accuracy_log" TO "authenticated";
GRANT ALL ON TABLE "public"."forecast_accuracy_log" TO "service_role";



GRANT ALL ON TABLE "public"."income" TO "anon";
GRANT ALL ON TABLE "public"."income" TO "authenticated";
GRANT ALL ON TABLE "public"."income" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_support_metrics" TO "anon";
GRANT ALL ON TABLE "public"."monthly_support_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_support_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."notification_history" TO "anon";
GRANT ALL ON TABLE "public"."notification_history" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_history" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."payees" TO "anon";
GRANT ALL ON TABLE "public"."payees" TO "authenticated";
GRANT ALL ON TABLE "public"."payees" TO "service_role";



GRANT ALL ON TABLE "public"."plan_limits" TO "anon";
GRANT ALL ON TABLE "public"."plan_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_limits" TO "service_role";



GRANT ALL ON TABLE "public"."plan_override_audit" TO "anon";
GRANT ALL ON TABLE "public"."plan_override_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_override_audit" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_order_line_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_order_line_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order_line_items" TO "service_role";



GRANT ALL ON TABLE "public"."purchased_addons" TO "anon";
GRANT ALL ON TABLE "public"."purchased_addons" TO "authenticated";
GRANT ALL ON TABLE "public"."purchased_addons" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_expense_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."recurring_expense_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_expense_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."referral_codes" TO "anon";
GRANT ALL ON TABLE "public"."referral_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_codes" TO "service_role";



GRANT ALL ON TABLE "public"."referral_rewards" TO "anon";
GRANT ALL ON TABLE "public"."referral_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."scenarios" TO "anon";
GRANT ALL ON TABLE "public"."scenarios" TO "authenticated";
GRANT ALL ON TABLE "public"."scenarios" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_customer_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."stripe_customer_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_customer_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."support_tickets_ticket_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."support_tickets_ticket_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."support_tickets_ticket_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."team_invitations" TO "anon";
GRANT ALL ON TABLE "public"."team_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."team_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_feedback" TO "anon";
GRANT ALL ON TABLE "public"."ticket_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_messages" TO "service_role";



GRANT ALL ON TABLE "public"."trial_addon_usage" TO "anon";
GRANT ALL ON TABLE "public"."trial_addon_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."trial_addon_usage" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."vendors" TO "anon";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";

drop policy "Allow public to validate active referral codes" on "public"."referral_codes";


  create policy "Allow public to validate active referral codes"
  on "public"."referral_codes"
  as permissive
  for select
  to anon, authenticated
using ((is_active = true));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER track_affiliate_on_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.track_affiliate_referral();


  create policy "Account members can delete purchase orders"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'purchase-orders'::text) AND ((storage.foldername(name))[1] IN ( SELECT (profiles.account_id)::text AS account_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))));



  create policy "Account members can update purchase orders"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'purchase-orders'::text) AND ((storage.foldername(name))[1] IN ( SELECT (profiles.account_id)::text AS account_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))));



  create policy "Account members can upload purchase orders"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'purchase-orders'::text) AND ((storage.foldername(name))[1] IN ( SELECT (profiles.account_id)::text AS account_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))));



  create policy "Account members can view purchase orders"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'purchase-orders'::text) AND ((storage.foldername(name))[1] IN ( SELECT (profiles.account_id)::text AS account_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())))));



  create policy "Users can delete their own purchase orders"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'purchase-orders'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update their own purchase orders"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'purchase-orders'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload their own purchase orders"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'purchase-orders'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can view their own purchase orders"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'purchase-orders'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



