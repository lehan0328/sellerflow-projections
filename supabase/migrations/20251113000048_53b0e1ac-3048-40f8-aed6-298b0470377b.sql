-- Drop the policy that references auth.users table directly (not allowed in RLS)
DROP POLICY IF EXISTS "Authenticated admins can read own permissions" ON admin_permissions;