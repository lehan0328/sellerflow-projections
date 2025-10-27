-- Fix forecast_confidence_threshold default value and update existing records
-- The valid values are: 3 (Aggressive), 8 (Moderate/default), 15 (Conservative)
-- But the database had a default of 88 which is invalid

-- Update any existing records with invalid value (88) to the default (8)
UPDATE user_settings
SET forecast_confidence_threshold = 8
WHERE forecast_confidence_threshold = 88;

-- Change the column default to 8 (Moderate - Balanced)
ALTER TABLE user_settings 
ALTER COLUMN forecast_confidence_threshold SET DEFAULT 8;

-- Add a comment to document the valid values
COMMENT ON COLUMN user_settings.forecast_confidence_threshold IS 'Valid values: 3 (Aggressive/Fast Cycle), 8 (Moderate/Balanced), 15 (Conservative/Safe)';