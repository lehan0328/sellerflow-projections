-- Drop the function with CASCADE to remove all dependent triggers
DROP FUNCTION IF EXISTS public.handle_new_user_role() CASCADE;

-- Create a simplified function that uses the account_id directly from NEW
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create owner role using the account_id from the NEW profile record
  IF NEW.account_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, account_id, role)
    VALUES (NEW.user_id, NEW.account_id, 'owner'::app_role)
    ON CONFLICT (user_id, account_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger on profiles table
CREATE TRIGGER on_new_user_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Update handle_new_user to also handle referral tracking
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
BEGIN
  -- Get referral code from metadata if present
  v_referral_code := NEW.raw_user_meta_data ->> 'referral_code';

  -- Insert profile
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    email,
    trial_start,
    trial_end
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    now(),
    now() + interval '168 hours'
  );

  -- Handle referral if code was provided
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    -- Find the referrer by code
    SELECT rc.user_id INTO v_referrer_id
    FROM public.referral_codes rc
    WHERE rc.code = v_referral_code;

    -- Create referral record if referrer found
    IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
      INSERT INTO public.referrals (
        referrer_id,
        referred_user_id,
        referral_code,
        status
      ) VALUES (
        v_referrer_id,
        NEW.id,
        v_referral_code,
        'trial'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;