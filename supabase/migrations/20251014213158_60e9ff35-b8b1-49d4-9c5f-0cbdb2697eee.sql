-- Add columns to track forecast enable/disable state
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS forecasts_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS forecasts_disabled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment to explain the 24-hour cooldown
COMMENT ON COLUMN user_settings.forecasts_disabled_at IS 'Timestamp when forecasts were disabled. User must wait 24 hours before re-enabling.';