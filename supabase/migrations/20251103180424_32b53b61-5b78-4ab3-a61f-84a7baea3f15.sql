-- Add modeling_method column to forecast_accuracy_log table
ALTER TABLE forecast_accuracy_log
ADD COLUMN IF NOT EXISTS modeling_method TEXT;

-- Add confidence_threshold column if it doesn't exist
ALTER TABLE forecast_accuracy_log
ADD COLUMN IF NOT EXISTS confidence_threshold NUMERIC;

-- Add index for faster queries by modeling method
CREATE INDEX IF NOT EXISTS idx_forecast_accuracy_modeling_method 
ON forecast_accuracy_log(modeling_method);

-- Add index for faster queries by date range
CREATE INDEX IF NOT EXISTS idx_forecast_accuracy_payout_date 
ON forecast_accuracy_log(payout_date DESC);

COMMENT ON COLUMN forecast_accuracy_log.modeling_method IS 'The forecasting algorithm used (e.g., auren_forecast_v1)';