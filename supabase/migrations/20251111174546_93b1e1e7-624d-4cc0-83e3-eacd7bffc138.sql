-- Drop existing policy and create a more comprehensive one
DROP POLICY IF EXISTS "Authenticated users can read own permissions" ON public.admin_permissions;

-- Allow authenticated users to read their own admin permissions
CREATE POLICY "Authenticated admins can read own permissions"
ON public.admin_permissions
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND account_created = true
);

-- Ensure anon users can still validate invitation tokens during signup
-- (This policy should already exist but let's make sure it's correct)
DROP POLICY IF EXISTS "Allow public token validation" ON public.admin_permissions;

CREATE POLICY "Allow public token validation"
ON public.admin_permissions
FOR SELECT
TO anon
USING (
  invitation_token IS NOT NULL 
  AND account_created = false 
  AND token_expires_at > NOW()
);