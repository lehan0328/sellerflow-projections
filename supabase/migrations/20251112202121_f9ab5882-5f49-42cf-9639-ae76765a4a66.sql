-- Add RLS policy to allow unauthenticated users to validate referral codes during signup
CREATE POLICY "Allow anon to read referral codes for validation"
ON public.profiles
FOR SELECT
TO anon
USING (my_referral_code IS NOT NULL);

-- Drop the auto-generation trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update handle_new_user to NOT auto-generate my_referral_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
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

  -- Create new account for regular users
  INSERT INTO accounts DEFAULT VALUES RETURNING id INTO v_account_id;

  -- Insert profile WITHOUT auto-generating my_referral_code
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
    NULL  -- my_referral_code will be generated manually later
  );

  -- Create user role as owner
  INSERT INTO user_roles (user_id, account_id, role)
  VALUES (NEW.id, v_account_id, 'owner');

  RETURN NEW;
END;
$$;

-- Re-create trigger without auto-generation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();