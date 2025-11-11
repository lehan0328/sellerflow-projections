-- Create admin_permissions table for managing admin dashboard access
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  invited_by TEXT,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Only website admins can read admin permissions
CREATE POLICY "Website admins can view admin permissions"
ON public.admin_permissions
FOR SELECT
TO authenticated
USING (is_website_admin());

-- Only website admins can insert admin permissions
CREATE POLICY "Website admins can invite admins"
ON public.admin_permissions
FOR INSERT
TO authenticated
WITH CHECK (is_website_admin());

-- Only website admins can update admin permissions
CREATE POLICY "Website admins can update admin permissions"
ON public.admin_permissions
FOR UPDATE
TO authenticated
USING (is_website_admin());

-- Only website admins can delete admin permissions
CREATE POLICY "Website admins can delete admin permissions"
ON public.admin_permissions
FOR DELETE
TO authenticated
USING (is_website_admin());

-- Create index on email for faster lookups
CREATE INDEX idx_admin_permissions_email ON public.admin_permissions(email);

-- Trigger to update updated_at
CREATE TRIGGER update_admin_permissions_updated_at
  BEFORE UPDATE ON public.admin_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();