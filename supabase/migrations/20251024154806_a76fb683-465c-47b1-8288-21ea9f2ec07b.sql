-- Enable forecasts for the CORRECT chuandy11113 user
UPDATE user_settings 
SET 
  forecasts_enabled = true,
  forecast_confidence_threshold = 8,
  forecasts_disabled_at = NULL,
  updated_at = NOW()
WHERE user_id = 'd4eb9f5c-3aeb-45ad-90ce-871b502cf0d6';

-- Also ensure the setting exists
INSERT INTO user_settings (user_id, account_id, forecasts_enabled, forecast_confidence_threshold)
SELECT 'd4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', account_id, true, 8
FROM profiles WHERE user_id = 'd4eb9f5c-3aeb-45ad-90ce-871b502cf0d6'
ON CONFLICT (user_id) DO NOTHING;