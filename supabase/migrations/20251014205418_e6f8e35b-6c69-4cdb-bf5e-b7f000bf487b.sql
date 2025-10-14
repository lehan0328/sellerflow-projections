-- Step 1: Drop the old constraint first
ALTER TABLE user_settings 
DROP CONSTRAINT user_settings_forecast_confidence_threshold_check;

-- Step 2: Update any out-of-range values to Safe (5)
UPDATE user_settings 
SET forecast_confidence_threshold = 5 
WHERE forecast_confidence_threshold < -5 OR forecast_confidence_threshold > 10;

-- Step 3: Add new constraint for -5 to 10
ALTER TABLE user_settings 
ADD CONSTRAINT user_settings_forecast_confidence_threshold_check 
CHECK (forecast_confidence_threshold >= -5 AND forecast_confidence_threshold <= 10);