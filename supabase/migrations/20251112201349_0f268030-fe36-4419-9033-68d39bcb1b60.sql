-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically generate referral codes for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users with my_referral_code
DO $$
DECLARE
  v_profile RECORD;
  v_referral_code TEXT;
  v_code_exists BOOLEAN;
  v_attempt_count INTEGER;
BEGIN
  -- Loop through all profiles without a my_referral_code
  FOR v_profile IN 
    SELECT user_id, email 
    FROM public.profiles 
    WHERE my_referral_code IS NULL
  LOOP
    v_attempt_count := 0;
    
    -- Generate unique code for this profile
    LOOP
      -- Generate code: first 4 letters of email (uppercase) + 4 random digits
      v_referral_code := UPPER(SUBSTRING(SPLIT_PART(v_profile.email, '@', 1) FROM 1 FOR 4)) || 
                         LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      
      -- Check if code already exists
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE my_referral_code = v_referral_code) 
      INTO v_code_exists;
      
      -- Exit loop if code is unique
      EXIT WHEN NOT v_code_exists;
      
      -- Safety: prevent infinite loop
      v_attempt_count := v_attempt_count + 1;
      EXIT WHEN v_attempt_count > 10;
    END LOOP;
    
    -- Update profile with generated code
    UPDATE public.profiles
    SET my_referral_code = v_referral_code
    WHERE user_id = v_profile.user_id;
    
    RAISE NOTICE 'Generated referral code % for user %', v_referral_code, v_profile.email;
  END LOOP;
END $$;