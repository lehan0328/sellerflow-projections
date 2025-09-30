-- Clean up data before Sept 29, 2025 for user 514bb5ae-8645-4e4f-94bd-8701a156a8ee
-- This ensures the account starts fresh on Sept 29 with 60k balance

-- Delete any vendors created before Sept 29
DELETE FROM vendors 
WHERE user_id = '514bb5ae-8645-4e4f-94bd-8701a156a8ee' 
AND created_at < '2025-09-29 00:00:00+00';

-- Delete any transactions before Sept 29
DELETE FROM transactions 
WHERE user_id = '514bb5ae-8645-4e4f-94bd-8701a156a8ee' 
AND transaction_date < '2025-09-29';

-- Delete any income entries before Sept 29
DELETE FROM income 
WHERE user_id = '514bb5ae-8645-4e4f-94bd-8701a156a8ee' 
AND payment_date < '2025-09-29';

-- Set starting balance to 60k
UPDATE user_settings 
SET total_cash = 60000 
WHERE user_id = '514bb5ae-8645-4e4f-94bd-8701a156a8ee';