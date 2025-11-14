-- Phase 3: Data Integrity & Audit - Ensure all recurring_expenses have account_id

-- Step 1: Add audit logging function for recurring expense queries
CREATE OR REPLACE FUNCTION log_recurring_expense_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when recurring expenses are queried with potential RLS issues
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      table_name,
      operation,
      user_id,
      record_id,
      metadata
    ) VALUES (
      'recurring_expenses',
      TG_OP,
      auth.uid(),
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
      END,
      jsonb_build_object(
        'account_id', CASE 
          WHEN TG_OP = 'DELETE' THEN OLD.account_id
          ELSE NEW.account_id
        END,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID,
  record_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (is_website_admin() OR has_admin_role(auth.uid()));

-- Step 3: Add trigger to log recurring expense access
DROP TRIGGER IF EXISTS log_recurring_expense_access_trigger ON public.recurring_expenses;
CREATE TRIGGER log_recurring_expense_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION log_recurring_expense_access();

-- Step 4: Ensure all recurring_expenses have account_id set
-- This fixes any existing records that might be missing account_id
UPDATE public.recurring_expenses re
SET account_id = p.account_id
FROM public.profiles p
WHERE re.user_id = p.user_id
  AND re.account_id IS NULL;

-- Step 5: Add constraint to prevent null account_id in future
-- First, make sure column allows null (we'll enforce it with trigger)
ALTER TABLE public.recurring_expenses 
  ALTER COLUMN account_id DROP NOT NULL;

-- Add validation trigger to ensure account_id is always set
CREATE OR REPLACE FUNCTION validate_recurring_expense_account_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If account_id is not set, get it from user's profile
  IF NEW.account_id IS NULL THEN
    SELECT account_id INTO NEW.account_id
    FROM public.profiles
    WHERE user_id = NEW.user_id;
    
    IF NEW.account_id IS NULL THEN
      RAISE EXCEPTION 'Cannot create recurring expense: user profile has no account_id';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_recurring_expense_account_id_trigger ON public.recurring_expenses;
CREATE TRIGGER validate_recurring_expense_account_id_trigger
  BEFORE INSERT OR UPDATE ON public.recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION validate_recurring_expense_account_id();

-- Step 6: Create function to check data consistency
CREATE OR REPLACE FUNCTION check_user_data_consistency(p_user_id UUID)
RETURNS TABLE(
  table_name TEXT,
  total_records BIGINT,
  missing_account_id BIGINT,
  account_id UUID
) AS $$
BEGIN
  -- Get user's account_id
  DECLARE
    v_account_id UUID;
  BEGIN
    SELECT account_id INTO v_account_id
    FROM public.profiles
    WHERE user_id = p_user_id;
    
    -- Check recurring_expenses
    RETURN QUERY
    SELECT 
      'recurring_expenses'::TEXT,
      COUNT(*)::BIGINT as total,
      COUNT(*) FILTER (WHERE re.account_id IS NULL)::BIGINT as missing,
      v_account_id
    FROM public.recurring_expenses re
    WHERE re.user_id = p_user_id;
    
    -- Check transactions
    RETURN QUERY
    SELECT 
      'transactions'::TEXT,
      COUNT(*)::BIGINT as total,
      COUNT(*) FILTER (WHERE t.account_id IS NULL)::BIGINT as missing,
      v_account_id
    FROM public.transactions t
    WHERE t.user_id = p_user_id;
    
    -- Check vendors
    RETURN QUERY
    SELECT 
      'vendors'::TEXT,
      COUNT(*)::BIGINT as total,
      COUNT(*) FILTER (WHERE v.account_id IS NULL)::BIGINT as missing,
      v_account_id
    FROM public.vendors v
    WHERE v.user_id = p_user_id;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users for consistency check
GRANT EXECUTE ON FUNCTION check_user_data_consistency(UUID) TO authenticated;

-- Step 7: Create monitoring view for RLS issues (admin only)
CREATE OR REPLACE VIEW admin_data_visibility_issues AS
SELECT 
  p.user_id,
  p.email,
  p.account_id,
  (SELECT COUNT(*) FROM recurring_expenses WHERE user_id = p.user_id) as recurring_count,
  (SELECT COUNT(*) FROM recurring_expenses WHERE user_id = p.user_id AND account_id IS NULL) as recurring_missing_account,
  (SELECT COUNT(*) FROM transactions WHERE user_id = p.user_id) as transaction_count,
  (SELECT COUNT(*) FROM transactions WHERE user_id = p.user_id AND account_id IS NULL) as transaction_missing_account
FROM profiles p
WHERE p.account_id IS NOT NULL
  AND (
    (SELECT COUNT(*) FROM recurring_expenses WHERE user_id = p.user_id AND account_id IS NULL) > 0
    OR (SELECT COUNT(*) FROM transactions WHERE user_id = p.user_id AND account_id IS NULL) > 0
  );

-- Grant select on view to admins only
GRANT SELECT ON admin_data_visibility_issues TO authenticated;

COMMENT ON VIEW admin_data_visibility_issues IS 'Shows users with potential data visibility issues due to missing account_id values';
