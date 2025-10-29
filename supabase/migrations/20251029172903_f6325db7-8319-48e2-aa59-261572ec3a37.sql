-- Fix the Amazon seller uniqueness validation to allow same user to reconnect
-- Drop all dependent triggers first

DROP TRIGGER IF EXISTS validate_amazon_seller_uniqueness ON amazon_accounts;
DROP TRIGGER IF EXISTS check_seller_uniqueness ON amazon_accounts;
DROP FUNCTION IF EXISTS validate_amazon_seller_uniqueness() CASCADE;

-- Updated function that checks if existing account belongs to a DIFFERENT user
CREATE OR REPLACE FUNCTION public.validate_amazon_seller_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_user_id UUID;
  v_existing_email TEXT;
BEGIN
  -- Only check if activating an account
  IF NEW.is_active = true THEN
    -- Check if seller_id already exists for another active account by a DIFFERENT user
    SELECT aa.user_id, au.email INTO v_existing_user_id, v_existing_email
    FROM amazon_accounts aa
    JOIN auth.users au ON au.id = aa.user_id
    WHERE aa.seller_id = NEW.seller_id 
      AND aa.is_active = true
      AND aa.id != NEW.id
      AND aa.user_id != NEW.user_id  -- CRITICAL: Only block if it's a different user
    LIMIT 1;
    
    IF v_existing_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Amazon Seller ID % is already connected to another account (%). Please log in with that account or contact support at support@auren.app', 
        NEW.seller_id, v_existing_email
      USING ERRCODE = '23505';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger (use standard naming)
CREATE TRIGGER check_seller_uniqueness
  BEFORE INSERT OR UPDATE ON amazon_accounts
  FOR EACH ROW
  EXECUTE FUNCTION validate_amazon_seller_uniqueness();

-- Also, deactivate any duplicate active accounts by the same user (keep only newest)
WITH ranked_accounts AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id, seller_id ORDER BY created_at DESC) as rn
  FROM amazon_accounts
  WHERE is_active = true
)
UPDATE amazon_accounts
SET is_active = false
WHERE id IN (
  SELECT id FROM ranked_accounts WHERE rn > 1
);