-- Fix referral code signup error by correcting column name in handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id uuid;
  v_account_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
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
    -- Find referrer by referral code
    SELECT user_id INTO v_referrer_id
    FROM profiles
    WHERE referral_code = NEW.raw_user_meta_data->>'referral_code'
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
$$ LANGUAGE plpgsql SECURITY DEFINER;