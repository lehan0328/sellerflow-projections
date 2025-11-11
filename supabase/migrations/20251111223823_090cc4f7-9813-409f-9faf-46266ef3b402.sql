-- Step 1: Update handle_new_user trigger to check for admin/staff
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is an admin/staff signup (check admin_permissions table)
  IF EXISTS (
    SELECT 1 FROM admin_permissions 
    WHERE email = NEW.email AND account_created = false
  ) THEN
    -- Admin/staff user - update admin_permissions, do NOT create profile
    UPDATE admin_permissions 
    SET account_created = true 
    WHERE email = NEW.email;
    
    RETURN NEW;
  END IF;
  
  -- Regular customer signup - create profile as normal
  INSERT INTO public.profiles (user_id, account_id, first_name, last_name, email, referral_code, hear_about_us, monthly_amazon_revenue)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    NEW.raw_user_meta_data->>'referral_code',
    NEW.raw_user_meta_data->>'hear_about_us',
    NEW.raw_user_meta_data->>'monthly_amazon_revenue'
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    email = NEW.email,
    first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', profiles.first_name),
    last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', profiles.last_name),
    referral_code = COALESCE(NEW.raw_user_meta_data->>'referral_code', profiles.referral_code),
    hear_about_us = COALESCE(NEW.raw_user_meta_data->>'hear_about_us', profiles.hear_about_us),
    monthly_amazon_revenue = COALESCE(NEW.raw_user_meta_data->>'monthly_amazon_revenue', profiles.monthly_amazon_revenue),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Step 2: Clean up existing admin/staff profiles
DELETE FROM profiles 
WHERE user_id IN (
  SELECT au.id 
  FROM auth.users au
  JOIN admin_permissions ap ON ap.email = au.email
  WHERE ap.account_created = true
);