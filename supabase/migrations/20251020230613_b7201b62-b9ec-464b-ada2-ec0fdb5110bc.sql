-- Set default value for forecasts_enabled to FALSE for new accounts
-- This ensures all new users start with forecasting disabled
-- They will be prompted during onboarding to enable it

ALTER TABLE user_settings 
ALTER COLUMN forecasts_enabled SET DEFAULT false;

-- Update the comment to reflect this change
COMMENT ON COLUMN user_settings.forecasts_enabled IS 'Whether AI forecasting is enabled for this user. Defaults to false - users opt-in during onboarding.';