-- Update the current authenticated user's profile to show Professional plan
-- This sets plan_override to 'professional' which will display as an active subscription

UPDATE public.profiles
SET 
  plan_override = 'professional',
  plan_override_reason = 'Admin granted access',
  account_status = 'active',
  trial_end = NULL,
  updated_at = now()
WHERE user_id = auth.uid();
