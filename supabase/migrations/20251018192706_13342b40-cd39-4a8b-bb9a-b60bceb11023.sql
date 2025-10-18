-- Add advanced modeling columns to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS advanced_modeling_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS advanced_modeling_notified BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_settings_advanced_modeling 
ON user_settings(user_id, advanced_modeling_enabled) 
WHERE advanced_modeling_enabled = TRUE;