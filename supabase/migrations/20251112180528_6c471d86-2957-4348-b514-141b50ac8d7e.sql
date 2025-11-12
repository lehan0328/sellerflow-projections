-- Create function to track affiliate referrals when new user signs up
CREATE OR REPLACE FUNCTION public.track_affiliate_referral()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
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
        status,
        referral_date
      ) VALUES (
        v_affiliate_id,
        NEW.id,
        'trial',
        NOW()
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

-- Create trigger that fires after user is created
DROP TRIGGER IF EXISTS track_affiliate_on_signup ON auth.users;
CREATE TRIGGER track_affiliate_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.track_affiliate_referral();