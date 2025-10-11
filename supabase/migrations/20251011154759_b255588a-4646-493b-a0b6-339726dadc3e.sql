-- Simulate payment failure for demo purposes
UPDATE profiles 
SET 
  account_status = 'suspended_payment',
  payment_failure_date = NOW()
WHERE user_id = '514bb5ae-8645-4e4f-94bd-8701a156a8ee';
