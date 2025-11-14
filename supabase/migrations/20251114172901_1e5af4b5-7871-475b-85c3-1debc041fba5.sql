-- Fix handle_new_user function to properly track signup analytics
-- This removes the non-existent onboarding_completed column
-- and adds back the missing analytics fields

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_affiliate_id uuid;
  v_referrer_id uuid;
BEGIN
  -- Insert profile with ALL signup analytics data
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    company,
    monthly_amazon_revenue,
    hear_about_us,
    referral_code
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'monthly_amazon_revenue',
    NEW.raw_user_meta_data->>'hear_about_us',
    substring(md5(random()::text) from 1 for 8)
  );

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