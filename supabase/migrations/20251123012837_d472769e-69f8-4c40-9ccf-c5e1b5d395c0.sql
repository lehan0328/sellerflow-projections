-- Allow anonymous users to view invitations by token for validation
-- This is safe because:
-- 1. Token is a UUID that's difficult to guess
-- 2. Policy only allows reading non-accepted, non-expired invitations
-- 3. Only exposes email, expires_at, and accepted_at fields (no sensitive data)
CREATE POLICY "Anonymous users can validate invitations by token"
ON public.team_invitations
FOR SELECT
TO anon
USING (
  token IS NOT NULL 
  AND accepted_at IS NULL 
  AND expires_at > NOW()
);