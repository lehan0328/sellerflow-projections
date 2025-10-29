-- Fix account_id mismatch for all Amazon-related tables
-- Update from incorrect account_id to correct profile account_id

-- Fix Amazon transactions
UPDATE amazon_transactions 
SET account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3' 
WHERE account_id = 'be7616d6-43e1-43dd-80b2-63941bb2467a';

-- Fix Amazon accounts
UPDATE amazon_accounts 
SET account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3' 
WHERE account_id = 'be7616d6-43e1-43dd-80b2-63941bb2467a';

-- Fix Amazon payouts
UPDATE amazon_payouts 
SET account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3' 
WHERE account_id = 'be7616d6-43e1-43dd-80b2-63941bb2467a';

-- Fix Amazon daily draws
UPDATE amazon_daily_draws 
SET account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3' 
WHERE account_id = 'be7616d6-43e1-43dd-80b2-63941bb2467a';

-- Fix Amazon daily rollups
UPDATE amazon_daily_rollups 
SET account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3' 
WHERE account_id = 'be7616d6-43e1-43dd-80b2-63941bb2467a';