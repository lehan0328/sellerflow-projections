-- Grant professional lifetime access to chuandy718@gmail.com
UPDATE public.profiles
SET 
  plan_override = 'professional',
  trial_end = NULL, -- NULL indicates no expiration
  plan_override_reason = 'Professional lifetime access granted manually'
WHERE user_id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'chuandy718@gmail.com'
);