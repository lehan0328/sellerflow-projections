-- Allow admins to read admin_permissions table
CREATE POLICY "Admins can read admin permissions"
ON public.admin_permissions
FOR SELECT
TO authenticated
USING (
  -- Check if user is in the hardcoded admin list or has admin role
  auth.jwt()->>'email' IN ('orders@imarand.com', 'chuandy914@gmail.com')
  OR EXISTS (
    SELECT 1 FROM public.admin_permissions ap
    WHERE ap.email = auth.jwt()->>'email'
    AND ap.role IN ('admin', 'staff')
  )
);