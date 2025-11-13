-- Update website admin accounts to enterprise plan
UPDATE profiles
SET plan_tier = 'enterprise', updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('chuandy914@gmail.com', 'orders@imarand.com')
);

-- Update trial users to professional plan
UPDATE profiles
SET plan_tier = 'professional', updated_at = NOW()
WHERE trial_end > NOW() AND trial_end IS NOT NULL;