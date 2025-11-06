-- Set plan override for kevin@imarand.com to professional tier
-- This gives them full Professional plan access without requiring payment

UPDATE public.profiles
SET 
  plan_override = 'professional',
  plan_override_reason = 'Complimentary professional plan access - no payment required',
  updated_at = NOW()
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'kevin@imarand.com'
  LIMIT 1
);

-- Verify the update
DO $$
DECLARE
  v_user_id UUID;
  v_plan_override TEXT;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'kevin@imarand.com'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User kevin@imarand.com not found';
  ELSE
    SELECT plan_override INTO v_plan_override
    FROM public.profiles
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Successfully set plan_override to % for kevin@imarand.com (user_id: %)', v_plan_override, v_user_id;
  END IF;
END $$;