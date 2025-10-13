-- Fix user_settings RLS policies to allow proper upsert operations

-- Drop existing policies
DROP POLICY IF EXISTS "Account members can create settings" ON user_settings;
DROP POLICY IF EXISTS "Account members can update settings" ON user_settings;

-- Recreate with proper checks
CREATE POLICY "Account members can create settings"
ON user_settings
FOR INSERT
TO authenticated
WITH CHECK (
  account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Account members can update settings"
ON user_settings
FOR UPDATE
TO authenticated
USING (
  account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  )
);