-- Update plan limits for financial connections (bank + credit cards)
UPDATE public.plan_limits
SET bank_connections = 2
WHERE plan_name = 'starter';

UPDATE public.plan_limits
SET bank_connections = 3
WHERE plan_name = 'growing';

UPDATE public.plan_limits
SET bank_connections = 4
WHERE plan_name = 'professional';

UPDATE public.plan_limits
SET bank_connections = 5
WHERE plan_name = 'enterprise';