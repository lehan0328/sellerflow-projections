-- Fix SECURITY DEFINER functions missing search_path
-- This prevents SQL injection attacks via search_path manipulation

-- Fix log_recurring_expense_access
CREATE OR REPLACE FUNCTION public.log_recurring_expense_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix validate_recurring_expense_account_id
CREATE OR REPLACE FUNCTION public.validate_recurring_expense_account_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix check_user_data_consistency
CREATE OR REPLACE FUNCTION public.check_user_data_consistency(p_user_id uuid)
RETURNS TABLE(table_name text, total_records bigint, missing_account_id bigint, account_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix overly permissive RLS policies
-- Drop all existing policies first to avoid conflicts

-- affiliate_referrals
DROP POLICY IF EXISTS "Enable read access for all users" ON public.affiliate_referrals;
DROP POLICY IF EXISTS "Affiliates can view their own referrals" ON public.affiliate_referrals;
DROP POLICY IF EXISTS "Admins can manage all affiliate referrals" ON public.affiliate_referrals;

CREATE POLICY "Affiliates can view their own referrals"
  ON public.affiliate_referrals
  FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM public.affiliates WHERE user_id = auth.uid()
    )
    OR public.is_website_admin()
  );

CREATE POLICY "Admins can manage all affiliate referrals"
  ON public.affiliate_referrals
  FOR ALL
  USING (public.is_website_admin())
  WITH CHECK (public.is_website_admin());

-- referrals
DROP POLICY IF EXISTS "Enable read access for all users" ON public.referrals;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can manage all referrals" ON public.referrals;

CREATE POLICY "Users can view their own referrals"
  ON public.referrals
  FOR SELECT
  USING (
    referrer_id = auth.uid() 
    OR referred_user_id = auth.uid()
    OR public.is_website_admin()
  );

CREATE POLICY "Users can create referrals"
  ON public.referrals
  FOR INSERT
  WITH CHECK (referred_user_id = auth.uid());

CREATE POLICY "Admins can manage all referrals"
  ON public.referrals
  FOR ALL
  USING (public.is_website_admin())
  WITH CHECK (public.is_website_admin());

-- referral_rewards
DROP POLICY IF EXISTS "Enable read access for all users" ON public.referral_rewards;
DROP POLICY IF EXISTS "Users can view their own rewards" ON public.referral_rewards;
DROP POLICY IF EXISTS "System can manage rewards" ON public.referral_rewards;

CREATE POLICY "Users can view their own rewards"
  ON public.referral_rewards
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_website_admin());

CREATE POLICY "System can manage rewards"
  ON public.referral_rewards
  FOR ALL
  USING (public.is_website_admin())
  WITH CHECK (public.is_website_admin());

-- amazon_sync_logs
DROP POLICY IF EXISTS "Enable read access for all users" ON public.amazon_sync_logs;
DROP POLICY IF EXISTS "Users can view their own sync logs" ON public.amazon_sync_logs;
DROP POLICY IF EXISTS "System can create sync logs" ON public.amazon_sync_logs;
DROP POLICY IF EXISTS "Admins can manage all sync logs" ON public.amazon_sync_logs;

CREATE POLICY "Users can view their own sync logs"
  ON public.amazon_sync_logs
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_website_admin());

CREATE POLICY "System can create sync logs"
  ON public.amazon_sync_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all sync logs"
  ON public.amazon_sync_logs
  FOR ALL
  USING (public.is_website_admin())
  WITH CHECK (public.is_website_admin());

-- plan_limits
DROP POLICY IF EXISTS "Enable read access for all users" ON public.plan_limits;
DROP POLICY IF EXISTS "Authenticated users can view plan limits" ON public.plan_limits;
DROP POLICY IF EXISTS "Only admins can modify plan limits" ON public.plan_limits;

CREATE POLICY "Authenticated users can view plan limits"
  ON public.plan_limits
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify plan limits"
  ON public.plan_limits
  FOR ALL
  USING (public.is_website_admin())
  WITH CHECK (public.is_website_admin());