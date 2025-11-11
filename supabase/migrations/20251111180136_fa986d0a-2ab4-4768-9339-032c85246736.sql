-- Create a security definer function to check admin permissions
-- This bypasses RLS and allows authenticated users to verify their admin status
CREATE OR REPLACE FUNCTION public.check_admin_permission(user_email text)
RETURNS TABLE(has_permission boolean, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    true as has_permission,
    ap.role
  FROM admin_permissions ap
  WHERE ap.email = user_email
    AND ap.account_created = true
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_admin_permission(text) TO authenticated;