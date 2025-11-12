-- Drop the policy causing infinite recursion on admin_permissions table
DROP POLICY IF EXISTS "Admins can read admin permissions" ON admin_permissions;