-- Fix handle_new_user to use correct profile columns
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id uuid;
  v_account_id uuid;
BEGIN
  -- Create profile with correct columns
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    email,
    company,
    monthly_amazon_revenue,
    hear_about_us,
    my_referral_code,
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
    upper(substring(md5(NEW.id::text) from 1 for 8)),
    now(),
    now()
  );

  -- Create user settings with default values
  INSERT INTO public.user_settings (
    user_id,
    reserve_amount,
    show_today_line,
    exclude_today_from_balance,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    0,
    false,
    false,
    now(),
    now()
  );

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;