-- Update vivenlin0914@gmail.com account to Enterprise Tier 1 with lifetime access
UPDATE profiles
SET 
  plan_override = 'tier1',
  plan_override_reason = 'Lifetime access - Enterprise Tier 1 (5 bank connections, 2 Amazon connections, 7 additional users)',
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'vivenlin0914@gmail.com' LIMIT 1
);