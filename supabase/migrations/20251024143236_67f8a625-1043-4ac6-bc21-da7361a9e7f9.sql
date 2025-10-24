-- Give chuandy11113 professional plan lifetime access
-- First, let's find and update the user by email pattern
UPDATE profiles
SET 
  plan_override = 'professional',
  plan_override_reason = 'Lifetime Professional Access - Granted by Admin',
  updated_at = now()
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%chuandy11113%'
);