-- Allow authenticated users to read their own admin permissions record
-- This is needed for the login verification flow

DROP POLICY IF EXISTS "Authenticated users can read own permissions" ON public.admin_permissions;

CREATE POLICY "Authenticated users can read own permissions"
ON public.admin_permissions
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);