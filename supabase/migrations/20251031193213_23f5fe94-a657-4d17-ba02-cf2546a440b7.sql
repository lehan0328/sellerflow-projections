-- Temporarily set trial_end to yesterday to display trial expired modal for testing
UPDATE profiles 
SET trial_end = (NOW() - INTERVAL '1 day')::date
WHERE user_id IN (
  SELECT id FROM auth.users LIMIT 1
);