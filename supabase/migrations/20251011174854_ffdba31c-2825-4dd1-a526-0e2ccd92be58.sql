-- Restore account status to active and clear payment failure date
UPDATE public.profiles 
SET 
  account_status = 'active',
  payment_failure_date = NULL
WHERE user_id = '514bb5ae-8645-4e4f-94bd-8701a156a8ee';