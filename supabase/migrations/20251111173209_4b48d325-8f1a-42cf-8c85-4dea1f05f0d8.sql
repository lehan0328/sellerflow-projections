-- Allow unauthenticated users to read admin_permissions for token validation during signup
-- This is necessary for the signup flow where users don't have auth yet

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public token validation" ON public.admin_permissions;

-- Create policy to allow reading invitation tokens for validation
CREATE POLICY "Allow public token validation"
ON public.admin_permissions
FOR SELECT
TO anon
USING (
  invitation_token IS NOT NULL 
  AND account_created = false 
  AND token_expires_at > NOW()
);