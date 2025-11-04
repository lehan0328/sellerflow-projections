-- Grant Professional Plan access to kevin@imarand.com
UPDATE public.profiles
SET 
  plan_override = 'professional',
  trial_end = NULL,  -- Remove trial restrictions
  max_team_members = 6,  -- Professional plan team limit
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'kevin@imarand.com'
);

-- Verify the update
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'kevin@imarand.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User kevin@imarand.com not found';
  ELSE
    RAISE NOTICE 'Successfully granted Professional Plan access to kevin@imarand.com';
  END IF;
END $$;