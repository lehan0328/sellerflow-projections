-- Update handle_new_user function to process affiliate codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_affiliate_id uuid;
  v_referrer_id uuid;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    referral_code,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    substring(md5(random()::text) from 1 for 8),
    false
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

-- Backfill existing users with affiliate codes
DO $$
DECLARE
  v_user RECORD;
  v_affiliate_id uuid;
BEGIN
  FOR v_user IN
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE raw_user_meta_data->>'affiliate_code' IS NOT NULL
  LOOP
    -- Check if referral already exists
    IF NOT EXISTS (
      SELECT 1 FROM affiliate_referrals
      WHERE referred_user_id = v_user.id
    ) THEN
      -- Look up affiliate
      SELECT id INTO v_affiliate_id
      FROM affiliates
      WHERE affiliate_code = v_user.raw_user_meta_data->>'affiliate_code'
        AND status = 'approved'
      LIMIT 1;

      -- Create referral record if affiliate found
      IF v_affiliate_id IS NOT NULL THEN
        INSERT INTO affiliate_referrals (
          affiliate_id,
          referred_user_id,
          affiliate_code,
          status,
          created_at
        )
        VALUES (
          v_affiliate_id,
          v_user.id,
          v_user.raw_user_meta_data->>'affiliate_code',
          'trial',
          (SELECT created_at FROM auth.users WHERE id = v_user.id)
        );

        -- Update affiliate metrics
        UPDATE affiliates
        SET 
          trial_referrals = trial_referrals + 1,
          total_referrals = total_referrals + 1,
          updated_at = now()
        WHERE id = v_affiliate_id;

        RAISE NOTICE 'Backfilled referral for user % with affiliate %', v_user.email, v_affiliate_id;
      END IF;
    END IF;
  END LOOP;
END;
$$;