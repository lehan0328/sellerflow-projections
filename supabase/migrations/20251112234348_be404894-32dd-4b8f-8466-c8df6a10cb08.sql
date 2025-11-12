-- Allow admins and staff to read all profiles for signup analytics
CREATE POLICY "Admins and staff can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Check if user is a hardcoded website admin
  auth.jwt()->>'email' IN ('chuandy914@gmail.com', 'orders@imarand.com')
  OR
  -- Check if user has admin or staff role in admin_permissions
  EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE admin_permissions.email = auth.jwt()->>'email'
    AND admin_permissions.account_created = true
    AND admin_permissions.role IN ('admin', 'staff')
  )
);