-- Add forecast_settings column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS forecast_settings JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.forecast_settings IS 'Stores user forecast preferences including payout frequency and weight settings';
