-- Give lifetime access to orders@imarand.com
UPDATE public.profiles
SET 
  plan_override = 'lifetime',
  trial_end = NULL,
  updated_at = NOW()
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'orders@imarand.com'
  LIMIT 1
);

-- Add comment to document this change
COMMENT ON COLUMN public.profiles.plan_override IS 'Plan override for special cases. Values: starter, growing, professional, enterprise, lifetime, or other custom plan names. NULL means use subscription-based plan.';