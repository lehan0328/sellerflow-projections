-- Create a dedicated table for plan override audit logs
CREATE TABLE IF NOT EXISTS public.plan_override_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  changed_by uuid NOT NULL,
  changed_by_email text NOT NULL,
  old_plan_tier text,
  new_plan_tier text NOT NULL,
  old_max_bank_connections integer,
  new_max_bank_connections integer,
  old_max_team_members integer,
  new_max_team_members integer,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_plan_override_audit_user_id ON public.plan_override_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_override_audit_created_at ON public.plan_override_audit(created_at DESC);

-- Enable RLS
ALTER TABLE public.plan_override_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Only website admins can view audit logs
CREATE POLICY "Website admins can view plan override audit logs"
  ON public.plan_override_audit
  FOR SELECT
  USING (is_website_admin() OR has_admin_role(auth.uid()));

-- Policy: System can insert audit logs
CREATE POLICY "System can insert plan override audit logs"
  ON public.plan_override_audit
  FOR INSERT
  WITH CHECK (true);