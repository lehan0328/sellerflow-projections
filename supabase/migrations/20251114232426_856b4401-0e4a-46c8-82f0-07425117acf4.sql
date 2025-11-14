-- Create Stripe customer audit log table
CREATE TABLE IF NOT EXISTS public.stripe_customer_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('audit', 'update', 'clear', 'create', 'auto_fix')),
  old_customer_id TEXT,
  new_customer_id TEXT,
  performed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stripe_customer_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit log
CREATE POLICY "Admins can view stripe audit log"
  ON public.stripe_customer_audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_website_admin());

-- Policy: Only admins can insert audit log
CREATE POLICY "Admins can insert stripe audit log"
  ON public.stripe_customer_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_website_admin());

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
  ON public.profiles(stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

-- Add index on audit log for querying
CREATE INDEX IF NOT EXISTS idx_stripe_audit_log_user_id 
  ON public.stripe_customer_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_stripe_audit_log_created_at 
  ON public.stripe_customer_audit_log(created_at DESC);