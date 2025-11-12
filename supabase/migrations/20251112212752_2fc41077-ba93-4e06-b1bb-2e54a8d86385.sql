-- Fix handle_new_user trigger function to resolve signup errors
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

  -- Generate account_id (don't insert into non-existent accounts table)
  v_account_id := gen_random_uuid();

  -- Insert profile with correct column names
  INSERT INTO profiles (
    user_id, 
    email, 
    first_name, 
    last_name, 
    company,
    monthly_amazon_revenue,
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
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'monthly_amazon_revenue',
    NEW.raw_user_meta_data->>'hear_about_us',
    NEW.raw_user_meta_data->>'referral_code',
    v_account_id,
    NULL
  );

  -- Create user role as owner
  INSERT INTO user_roles (user_id, account_id, role)
  VALUES (NEW.id, v_account_id, 'owner');

  RETURN NEW;
END;
$$;