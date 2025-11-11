-- Ensure orders@imarand.com has active account status and lifetime access
UPDATE public.profiles
SET 
  account_status = 'active',
  plan_override = 'lifetime',
  trial_end = NULL,
  updated_at = NOW()
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'orders@imarand.com'
  LIMIT 1
);