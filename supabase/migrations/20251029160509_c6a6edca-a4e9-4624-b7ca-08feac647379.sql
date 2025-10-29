-- Fix user_id mismatch across all Amazon tables and add safeguards
-- This ensures user_id always matches a valid user who belongs to the account_id

-- Step 1: Fix the current user_id mismatch in amazon_accounts
-- The account_id '54ca6953-5f8b-4104-b5bc-470b30c2b6f3' belongs to user '514bb5ae-8645-4e4f-94bd-8701a156a8ee'
UPDATE amazon_accounts 
SET user_id = (
  SELECT user_id 
  FROM profiles 
  WHERE account_id = amazon_accounts.account_id 
  AND is_account_owner = true
  LIMIT 1
)
WHERE account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3';

-- Step 2: Fix user_id in amazon_transactions to match the account owner
UPDATE amazon_transactions 
SET user_id = (
  SELECT user_id 
  FROM profiles 
  WHERE account_id = amazon_transactions.account_id 
  AND is_account_owner = true
  LIMIT 1
)
WHERE account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3';

-- Step 3: Fix user_id in amazon_payouts
UPDATE amazon_payouts 
SET user_id = (
  SELECT user_id 
  FROM profiles 
  WHERE account_id = amazon_payouts.account_id 
  AND is_account_owner = true
  LIMIT 1
)
WHERE account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3';

-- Step 4: Fix user_id in amazon_daily_draws
UPDATE amazon_daily_draws 
SET user_id = (
  SELECT user_id 
  FROM profiles 
  WHERE account_id = amazon_daily_draws.account_id 
  AND is_account_owner = true
  LIMIT 1
)
WHERE account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3';

-- Step 5: Fix user_id in amazon_daily_rollups
UPDATE amazon_daily_rollups 
SET user_id = (
  SELECT user_id 
  FROM profiles 
  WHERE account_id = amazon_daily_rollups.account_id 
  AND is_account_owner = true
  LIMIT 1
)
WHERE account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3';

-- Step 6: Create a trigger function to automatically sync user_id when account_id is set/changed
CREATE OR REPLACE FUNCTION sync_user_id_with_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If account_id is set, ensure user_id matches an owner of that account
  IF NEW.account_id IS NOT NULL THEN
    -- Get the account owner's user_id
    SELECT user_id INTO NEW.user_id
    FROM profiles
    WHERE account_id = NEW.account_id
    AND is_account_owner = true
    LIMIT 1;
    
    -- If no owner found, use the current user_id but log a warning
    IF NEW.user_id IS NULL THEN
      RAISE WARNING 'No account owner found for account_id %, keeping user_id %', NEW.account_id, NEW.user_id;
      -- Keep the existing user_id instead of setting to null
      NEW.user_id := COALESCE(NEW.user_id, auth.uid());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 7: Apply trigger to amazon_accounts table
DROP TRIGGER IF EXISTS sync_amazon_accounts_user_id ON amazon_accounts;
CREATE TRIGGER sync_amazon_accounts_user_id
  BEFORE INSERT OR UPDATE OF account_id ON amazon_accounts
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_id_with_account();

-- Step 8: Apply trigger to amazon_transactions table
DROP TRIGGER IF EXISTS sync_amazon_transactions_user_id ON amazon_transactions;
CREATE TRIGGER sync_amazon_transactions_user_id
  BEFORE INSERT OR UPDATE OF account_id ON amazon_transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_id_with_account();

-- Step 9: Apply trigger to amazon_payouts table
DROP TRIGGER IF EXISTS sync_amazon_payouts_user_id ON amazon_payouts;
CREATE TRIGGER sync_amazon_payouts_user_id
  BEFORE INSERT OR UPDATE OF account_id ON amazon_payouts
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_id_with_account();

-- Step 10: Apply trigger to amazon_daily_draws table
DROP TRIGGER IF EXISTS sync_amazon_daily_draws_user_id ON amazon_daily_draws;
CREATE TRIGGER sync_amazon_daily_draws_user_id
  BEFORE INSERT OR UPDATE OF account_id ON amazon_daily_draws
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_id_with_account();

-- Step 11: Apply trigger to amazon_daily_rollups table
DROP TRIGGER IF EXISTS sync_amazon_daily_rollups_user_id ON amazon_daily_rollups;
CREATE TRIGGER sync_amazon_daily_rollups_user_id
  BEFORE INSERT OR UPDATE OF account_id ON amazon_daily_rollups
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_id_with_account();

COMMENT ON FUNCTION sync_user_id_with_account() IS 'Automatically syncs user_id to match the account owner when account_id is set or changed. Prevents user_id/account_id mismatches.';
