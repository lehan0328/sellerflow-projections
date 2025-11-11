-- Create a security definer function to get all admin permissions
-- This bypasses RLS and allows admins to view the full list of admin users
CREATE OR REPLACE FUNCTION public.get_all_admin_permissions()
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  invited_by text,
  invited_at timestamptz,
  account_created boolean,
  first_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ap.id,
    ap.email,
    ap.role,
    ap.invited_by,
    ap.invited_at,
    ap.account_created,
    ap.first_name
  FROM admin_permissions ap
  ORDER BY ap.invited_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_admin_permissions() TO authenticated;