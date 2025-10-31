-- Update handle_new_user function to save monthly_amazon_revenue
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
BEGIN
  -- Get referral code from metadata if present
  v_referral_code := NEW.raw_user_meta_data ->> 'referral_code';

  -- Insert profile with professional plan limits (6 team members for trial)
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name,
    company,
    monthly_revenue,
    amazon_marketplaces,
    monthly_amazon_revenue,
    trial_start,
    trial_end,
    max_team_members
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'company',
    NEW.raw_user_meta_data ->> 'monthly_revenue',
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'ecommerce_marketplaces' IS NOT NULL 
      THEN ARRAY(SELECT jsonb_array_elements_text((NEW.raw_user_meta_data ->> 'ecommerce_marketplaces')::jsonb))
      ELSE NULL
    END,
    NEW.raw_user_meta_data ->> 'monthly_amazon_revenue',
    now(),
    now() + interval '168 hours',
    6  -- Professional plan allows 6 team members (owner + 5 additional)
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