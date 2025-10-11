-- Restore account to active status
UPDATE profiles 
SET 
  account_status = 'active',
  payment_failure_date = NULL
WHERE user_id = '514bb5ae-8645-4e4f-94bd-8701a156a8ee';

-- Set trial end to yesterday to simulate expired trial
UPDATE profiles 
SET 
  trial_end = NOW() - INTERVAL '1 day',
  trial_start = NOW() - INTERVAL '8 days'
WHERE user_id = '514bb5ae-8645-4e4f-94bd-8701a156a8ee';