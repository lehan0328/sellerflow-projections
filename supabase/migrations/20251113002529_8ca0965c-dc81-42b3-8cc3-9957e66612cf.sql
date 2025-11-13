-- Step 1: Add plan_tier column to profiles (nullable initially for safety)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS plan_tier TEXT;

-- Step 2: Backfill existing users based on their current status
UPDATE profiles
SET plan_tier = CASE
  WHEN plan_override IN ('tier1', 'tier2', 'tier3', 'tier4', 'tier5', 'lifetime', 'lifetime_access') THEN 'enterprise'
  WHEN plan_override IN ('professional', 'growing', 'starter') THEN plan_override
  WHEN trial_end IS NOT NULL AND trial_end > now() THEN 'professional'
  ELSE 'starter'
END
WHERE plan_tier IS NULL;

-- Step 3: Fix the specific user (chuandy1237@gmail.com) with trial dates and plan_tier
UPDATE profiles
SET 
  trial_start = now(),
  trial_end = now() + interval '168 hours',
  plan_tier = 'professional'
WHERE email = 'chuandy1237@gmail.com';

-- Step 4: Update handle_new_user() trigger to set trial dates and plan_tier
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
    UPDATE admin_permissions 
    SET account_created = true 
    WHERE email = NEW.email;
    RETURN NEW;
  END IF;

  v_account_id := gen_random_uuid();

  -- Insert profile with trial dates and plan_tier
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
    my_referral_code,
    trial_start,
    trial_end,
    plan_tier
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
    NULL,
    now(),
    now() + interval '168 hours',
    'professional'
  );

  INSERT INTO user_roles (user_id, account_id, role)
  VALUES (NEW.id, v_account_id, 'owner')
  ON CONFLICT (user_id, account_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Step 5: Add default after backfill
ALTER TABLE profiles 
ALTER COLUMN plan_tier SET DEFAULT 'starter';

COMMENT ON COLUMN profiles.plan_tier IS 'Explicit plan tier (professional, growing, starter, enterprise) - separate from trial status';