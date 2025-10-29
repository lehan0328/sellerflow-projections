-- Fix the user's profile account_id to match the correct account
-- This will make the Amazon account visible again through RLS policies

UPDATE profiles
SET account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3'
WHERE user_id = 'd4eb9f5c-3aeb-45ad-90ce-871b502cf0d6'
AND account_id = 'be7616d6-43e1-43dd-80b2-63941bb2467a';

-- Verify and log the change
DO $$
DECLARE
  v_profile_count INTEGER;
  v_amazon_count INTEGER;
BEGIN
  -- Count profiles with correct account_id
  SELECT COUNT(*) INTO v_profile_count
  FROM profiles
  WHERE user_id = 'd4eb9f5c-3aeb-45ad-90ce-871b502cf0d6'
  AND account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3';
  
  -- Count Amazon accounts with correct account_id
  SELECT COUNT(*) INTO v_amazon_count
  FROM amazon_accounts
  WHERE account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3';
  
  RAISE NOTICE 'Profile fixed: % profiles now have correct account_id', v_profile_count;
  RAISE NOTICE 'Amazon accounts with this account_id: %', v_amazon_count;
END $$;
