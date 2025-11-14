-- Complete fix for handle_new_user with trial setup, account_id, and user roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_account_id uuid;
BEGIN
  -- Check if user is admin/staff (prevent profile creation for admin invites)
  IF EXISTS (
    SELECT 1 FROM admin_permissions 
    WHERE email = NEW.email 
    AND account_created = false
  ) THEN
    UPDATE admin_permissions 
    SET account_created = true 
    WHERE email = NEW.email;
    RETURN NEW;
  END IF;

  -- Generate account_id
  v_account_id := gen_random_uuid();

  -- Create profile with ALL required fields including trial dates
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    email,
    company,
    monthly_amazon_revenue,
    hear_about_us,
    account_id,
    my_referral_code,
    trial_start,
    trial_end,
    plan_tier,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'monthly_amazon_revenue',
    NEW.raw_user_meta_data->>'hear_about_us',
    v_account_id,
    upper(substring(md5(NEW.id::text) from 1 for 8)),
    now(),
    now() + interval '168 hours',
    'professional',
    now(),
    now()
  );

  -- Create owner role for the new account
  INSERT INTO public.user_roles (user_id, account_id, role)
  VALUES (NEW.id, v_account_id, 'owner'::app_role)
  ON CONFLICT (user_id, account_id) DO NOTHING;

  -- Create user settings with only user_id (other columns have defaults)
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  -- Handle referral code if present
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    -- Find referrer by referral code using my_referral_code column
    SELECT user_id INTO v_referrer_id
    FROM profiles
    WHERE my_referral_code = NEW.raw_user_meta_data->>'referral_code'
    LIMIT 1;

    -- If referrer found, create referral record
    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO referrals (referrer_id, referred_user_id, referral_code, status, created_at, updated_at)
      VALUES (
        v_referrer_id,
        NEW.id,
        NEW.raw_user_meta_data->>'referral_code',
        'trial',
        now(),
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;