-- Grant lifetime access to orders@imarand.com
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find the user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'orders@imarand.com';

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email orders@imarand.com not found';
  END IF;

  -- Update their profile with lifetime access override
  UPDATE profiles
  SET 
    plan_override = 'professional',
    plan_override_reason = 'Lifetime Access - Granted by Admin',
    updated_at = now()
  WHERE user_id = target_user_id;

  -- Log the result
  RAISE NOTICE 'Granted lifetime professional plan access to orders@imarand.com (user_id: %)', target_user_id;
END $$;