-- Add account_id to user_settings table to share settings across team members
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS account_id UUID;

-- Populate account_id from profiles table
UPDATE user_settings us
SET account_id = p.account_id
FROM profiles p
WHERE us.user_id = p.user_id
AND us.account_id IS NULL;

-- Update RLS policies to allow account members to access settings
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can create their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;

-- Create account-based RLS policies
CREATE POLICY "Account members can view settings"
ON user_settings FOR SELECT
TO authenticated
USING (
  account_id IN (
    SELECT account_id
    FROM profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Account members can create settings"
ON user_settings FOR INSERT
TO authenticated
WITH CHECK (
  account_id IN (
    SELECT account_id
    FROM profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Account members can update settings"
ON user_settings FOR UPDATE
TO authenticated
USING (
  account_id IN (
    SELECT account_id
    FROM profiles
    WHERE user_id = auth.uid()
  )
);