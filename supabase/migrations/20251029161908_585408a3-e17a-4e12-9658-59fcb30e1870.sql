-- Phase 1: IMMEDIATE - Deactivate ALL Amazon connections for security review
UPDATE amazon_accounts 
SET is_active = false, 
    updated_at = NOW()
WHERE is_active = true;

-- Phase 2: Create unique index to enforce one seller_id per active connection
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_seller_id 
ON amazon_accounts (seller_id) 
WHERE is_active = true;

-- Create validation function to prevent duplicate seller_id connections
CREATE OR REPLACE FUNCTION validate_amazon_seller_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_user_id UUID;
  v_existing_email TEXT;
BEGIN
  -- Only check if activating an account
  IF NEW.is_active = true THEN
    -- Check if seller_id already exists for another active account
    SELECT aa.user_id, au.email INTO v_existing_user_id, v_existing_email
    FROM amazon_accounts aa
    JOIN auth.users au ON au.id = aa.user_id
    WHERE aa.seller_id = NEW.seller_id 
      AND aa.is_active = true
      AND aa.id != NEW.id
    LIMIT 1;
    
    IF v_existing_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Amazon Seller ID % is already connected to another account (%). Please log in with that account or contact support at support@auren.app', 
        NEW.seller_id, v_existing_email
      USING ERRCODE = '23505';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for seller uniqueness validation
DROP TRIGGER IF EXISTS check_seller_uniqueness ON amazon_accounts;
CREATE TRIGGER check_seller_uniqueness
BEFORE INSERT OR UPDATE ON amazon_accounts
FOR EACH ROW
EXECUTE FUNCTION validate_amazon_seller_uniqueness();

-- Phase 5: Create audit table for Amazon connection changes
CREATE TABLE IF NOT EXISTS amazon_connection_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  previous_user_id UUID,
  new_user_id UUID,
  action TEXT NOT NULL,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE amazon_connection_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view Amazon connection audit"
ON amazon_connection_audit FOR SELECT
TO authenticated
USING (is_website_admin() OR has_admin_role(auth.uid()));

-- Create account modification audit table
CREATE TABLE IF NOT EXISTS account_modification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_account_id UUID,
  new_account_id UUID,
  modified_by UUID REFERENCES auth.users(id),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on modification audit
ALTER TABLE account_modification_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view account modification audit"
ON account_modification_audit FOR SELECT
TO authenticated
USING (is_website_admin() OR has_admin_role(auth.uid()));

-- Phase 6: Prevent unauthorized account_id changes
CREATE OR REPLACE FUNCTION prevent_unauthorized_account_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing account_id unless user is admin
  IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
    IF NOT is_website_admin() THEN
      RAISE EXCEPTION 'Unauthorized account_id modification. Contact support at support@auren.app';
    END IF;
    
    -- Log the change
    INSERT INTO account_modification_audit (
      table_name, record_id, old_account_id, new_account_id, 
      modified_by, modified_at
    ) VALUES (
      TG_TABLE_NAME, NEW.id, OLD.account_id, NEW.account_id,
      auth.uid(), NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply account_id protection to amazon_accounts
DROP TRIGGER IF EXISTS prevent_amazon_account_changes ON amazon_accounts;
CREATE TRIGGER prevent_amazon_account_changes
BEFORE UPDATE ON amazon_accounts
FOR EACH ROW EXECUTE FUNCTION prevent_unauthorized_account_changes();

-- Phase 7: Log duplicate connection attempts and create support tickets
CREATE OR REPLACE FUNCTION log_duplicate_amazon_attempt()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_email TEXT;
  v_attempting_email TEXT;
BEGIN
  -- Only trigger on duplicate attempts (when validation would fail)
  IF NEW.is_active = true THEN
    -- Check if there's an existing active connection
    SELECT au.email INTO v_existing_email
    FROM amazon_accounts aa
    JOIN auth.users au ON au.id = aa.user_id
    WHERE aa.seller_id = NEW.seller_id 
      AND aa.is_active = true
      AND aa.id != NEW.id
    LIMIT 1;
    
    IF v_existing_email IS NOT NULL THEN
      -- Get attempting user's email
      SELECT email INTO v_attempting_email
      FROM auth.users
      WHERE id = NEW.user_id;
      
      -- Create support ticket for investigation
      INSERT INTO support_tickets (
        user_id, subject, message, category, priority, status
      ) VALUES (
        NEW.user_id,
        'Duplicate Amazon Seller Connection Attempt',
        format('User %s attempted to connect Amazon Seller ID %s which is already connected to account %s. This requires investigation to determine rightful ownership.', 
          v_attempting_email, NEW.seller_id, v_existing_email),
        'Security Alert',
        'high',
        'open'
      );
      
      -- Log in audit table
      INSERT INTO amazon_connection_audit (
        seller_id, previous_user_id, new_user_id, action, reason, performed_by
      ) VALUES (
        NEW.seller_id, 
        (SELECT user_id FROM amazon_accounts WHERE seller_id = NEW.seller_id AND is_active = true AND id != NEW.id LIMIT 1),
        NEW.user_id,
        'blocked_duplicate',
        'Duplicate seller_id connection attempt',
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for logging duplicate attempts (runs before validation)
DROP TRIGGER IF EXISTS log_amazon_duplicate_attempts ON amazon_accounts;
CREATE TRIGGER log_amazon_duplicate_attempts
BEFORE INSERT OR UPDATE ON amazon_accounts
FOR EACH ROW EXECUTE FUNCTION log_duplicate_amazon_attempt();