-- Grant lifetime access to chuandy914@gmail.com
UPDATE public.profiles 
SET 
  plan_override = 'professional',
  plan_override_reason = 'Lifetime access granted',
  trial_end = '2099-12-31 23:59:59'::timestamp with time zone
WHERE user_id = '514bb5ae-8645-4e4f-94bd-8701a156a8ee';