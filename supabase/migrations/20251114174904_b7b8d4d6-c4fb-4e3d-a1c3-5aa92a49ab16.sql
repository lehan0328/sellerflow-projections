-- Update handle_new_user to set all new trial accounts to professional tier
-- This ensures new signups get professional tier during their trial period

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_affiliate_id uuid;
  v_referrer_id uuid;
  v_account_id uuid;
BEGIN
  -- Check if user is an admin/staff (should not create profile)
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

  -- Generate account_id for new user
  v_account_id := gen_random_uuid();

  -- Insert profile with ALL signup analytics data + trial dates + professional tier
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    company,
    monthly_amazon_revenue,
    hear_about_us,
    referral_code,
    account_id,
    my_referral_code,
    trial_start,
    trial_end,
    plan_tier
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'monthly_amazon_revenue',
    NEW.raw_user_meta_data->>'hear_about_us',
    NEW.raw_user_meta_data->>'referral_code',
    v_account_id,
    NULL,
    now(),
    now() + interval '168 hours',  -- 7 day trial
    'professional'  -- All new trials are professional tier
  );

  -- Create user_roles entry as owner
  INSERT INTO user_roles (user_id, account_id, role)
  VALUES (NEW.id, v_account_id, 'owner')
  ON CONFLICT (user_id, account_id) DO NOTHING;

  -- Handle affiliate code if present
  IF NEW.raw_user_meta_data->>'affiliate_code' IS NOT NULL THEN
    -- Look up affiliate by code
    SELECT id INTO v_affiliate_id
    FROM affiliates
    WHERE affiliate_code = NEW.raw_user_meta_data->>'affiliate_code'
      AND status = 'approved'
    LIMIT 1;

    -- If affiliate found, create referral record
    IF v_affiliate_id IS NOT NULL THEN
      INSERT INTO affiliate_referrals (
        affiliate_id,
        referred_user_id,
        affiliate_code,
        status
      )
      VALUES (
        v_affiliate_id,
        NEW.id,
        NEW.raw_user_meta_data->>'affiliate_code',
        'trial'
      );

      -- Update affiliate metrics
      UPDATE affiliates
      SET 
        trial_referrals = trial_referrals + 1,
        total_referrals = total_referrals + 1,
        monthly_referrals = monthly_referrals + 1,
        updated_at = now()
      WHERE id = v_affiliate_id;
    END IF;
  END IF;

  -- Handle regular referral code if present
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT user_id INTO v_referrer_id
    FROM profiles
    WHERE referral_code = NEW.raw_user_meta_data->>'referral_code'
    LIMIT 1;

    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO referrals (referrer_id, referred_id, referral_code)
      VALUES (v_referrer_id, NEW.id, NEW.raw_user_meta_data->>'referral_code');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;