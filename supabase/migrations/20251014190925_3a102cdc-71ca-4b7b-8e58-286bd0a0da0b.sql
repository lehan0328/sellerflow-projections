-- Add columns to track original forecast data when actual payout replaces it
ALTER TABLE amazon_payouts 
ADD COLUMN IF NOT EXISTS original_forecast_amount numeric,
ADD COLUMN IF NOT EXISTS forecast_replaced_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS forecast_accuracy_percentage numeric;

-- Create index for faster queries on forecast comparisons
CREATE INDEX IF NOT EXISTS idx_amazon_payouts_forecast_replaced 
ON amazon_payouts(forecast_replaced_at) 
WHERE forecast_replaced_at IS NOT NULL;

-- Add comment explaining the new fields
COMMENT ON COLUMN amazon_payouts.original_forecast_amount IS 'Original AI forecasted amount before being replaced by actual payout data';
COMMENT ON COLUMN amazon_payouts.forecast_replaced_at IS 'Timestamp when forecasted payout was replaced with actual data';
COMMENT ON COLUMN amazon_payouts.forecast_accuracy_percentage IS 'Percentage accuracy of forecast vs actual (100 = perfect match)';