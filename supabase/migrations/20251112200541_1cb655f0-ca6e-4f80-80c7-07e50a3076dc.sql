-- Add column for user's own referral code (the code they share with others)
ALTER TABLE profiles ADD COLUMN my_referral_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_profiles_my_referral_code ON profiles(my_referral_code);

-- Update the handle_new_user trigger to generate unique referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_referral_code text;
  v_code_exists boolean;
  v_attempt_count integer := 0;
BEGIN
  -- Check if user is an admin/staff (should not create profile)
  IF EXISTS (
    SELECT 1 FROM admin_permissions 
    WHERE email = NEW.email 
    AND account_created = false
  ) THEN
    -- Update admin_permissions to mark account as created
    UPDATE admin_permissions 
    SET account_created = true 
    WHERE email = NEW.email;
    RETURN NEW;
  END IF;

  -- Generate unique referral code for regular users
  LOOP
    -- Generate code: first 4 letters of email (uppercase) + 4 random digits
    v_referral_code := UPPER(SUBSTRING(SPLIT_PART(NEW.email, '@', 1) FROM 1 FOR 4)) || 
                       LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE my_referral_code = v_referral_code) INTO v_code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT v_code_exists;
    
    -- Safety: prevent infinite loop
    v_attempt_count := v_attempt_count + 1;
    EXIT WHEN v_attempt_count > 10;
  END LOOP;

  -- Create new account for this user
  INSERT INTO accounts DEFAULT VALUES RETURNING id INTO v_account_id;

  -- Insert profile with generated referral code
  INSERT INTO profiles (
    user_id, 
    email, 
    first_name, 
    last_name, 
    company_name, 
    monthly_revenue, 
    hear_about_us,
    referral_code,
    account_id,
    my_referral_code
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'monthly_revenue',
    NEW.raw_user_meta_data->>'hear_about_us',
    NEW.raw_user_meta_data->>'referral_code',
    v_account_id,
    v_referral_code
  );

  -- Create user role as owner
  INSERT INTO user_roles (user_id, account_id, role)
  VALUES (NEW.id, v_account_id, 'owner');

  RETURN NEW;
END;
$$;