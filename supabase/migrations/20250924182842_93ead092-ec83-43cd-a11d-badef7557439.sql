-- Reset total_cash to 0 for users who have no transactions (treat as new accounts)
UPDATE public.user_settings us
SET total_cash = 0
WHERE total_cash <> 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.user_id = us.user_id
  );