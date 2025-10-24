-- Enable forecasts for chuandy11113
INSERT INTO user_settings (user_id, account_id, forecasts_enabled, forecast_confidence_threshold, forecasts_disabled_at)
VALUES ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', '54ca6953-5f8b-4104-b5bc-470b30c2b6f3', true, 8, NULL)
ON CONFLICT (user_id) 
DO UPDATE SET 
  forecasts_enabled = true,
  forecast_confidence_threshold = 8,
  forecasts_disabled_at = NULL,
  updated_at = NOW();