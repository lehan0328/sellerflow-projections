-- Change the default value for total_cash to 0 for new users
ALTER TABLE public.user_settings ALTER COLUMN total_cash SET DEFAULT 0;

-- Update any existing users who still have the default 100000 to 0 (optional - only if you want to reset everyone)
UPDATE public.user_settings SET total_cash = 0 WHERE total_cash = 100000;