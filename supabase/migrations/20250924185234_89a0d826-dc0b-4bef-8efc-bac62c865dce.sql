-- Targeted reset for specific user so new balance reflects only newly added income
-- User: 8ecf98e9-e833-435d-9967-c711bed5c3d0
BEGIN;

-- Delete all user transactions
DELETE FROM public.transactions
WHERE user_id = '8ecf98e9-e833-435d-9967-c711bed5c3d0';

-- Delete all user vendors (optional cleanup matching app's Reset action)
DELETE FROM public.vendors
WHERE user_id = '8ecf98e9-e833-435d-9967-c711bed5c3d0';

-- Reset user settings total cash to zero
UPDATE public.user_settings
SET total_cash = 0
WHERE user_id = '8ecf98e9-e833-435d-9967-c711bed5c3d0';

COMMIT;