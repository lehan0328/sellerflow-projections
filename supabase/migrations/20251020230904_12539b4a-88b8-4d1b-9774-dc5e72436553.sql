-- Step 1: Fix existing invalid forecast_confidence_threshold values
-- Convert any invalid values to the nearest valid value:
-- 0-5 -> 3 (Aggressive)
-- 6-11 -> 8 (Moderate)  
-- 12+ -> 15 (Conservative)

UPDATE user_settings
SET forecast_confidence_threshold = CASE
  WHEN forecast_confidence_threshold <= 5 THEN 3
  WHEN forecast_confidence_threshold <= 11 THEN 8
  ELSE 15
END
WHERE forecast_confidence_threshold NOT IN (3, 8, 15);

-- Step 2: Drop old constraint if exists
ALTER TABLE user_settings 
DROP CONSTRAINT IF EXISTS user_settings_forecast_confidence_threshold_check;

-- Step 3: Add new constraint allowing only 3, 8, or 15
ALTER TABLE user_settings
ADD CONSTRAINT user_settings_forecast_confidence_threshold_check 
CHECK (forecast_confidence_threshold IN (3, 8, 15));