-- Drop the old check constraint
ALTER TABLE amazon_payouts
DROP CONSTRAINT IF EXISTS amazon_payouts_modeling_method_check;

-- Add new check constraint with auren_forecast_v1 included
ALTER TABLE amazon_payouts
ADD CONSTRAINT amazon_payouts_modeling_method_check 
CHECK (modeling_method = ANY (ARRAY[
  'mathematical_biweekly'::text, 
  'mathematical_daily'::text, 
  'ai_forecast'::text, 
  'baseline_estimate'::text,
  'auren_forecast_v1'::text
]));

-- Now backfill modeling_method for existing forecasted payouts
UPDATE amazon_payouts
SET modeling_method = 'auren_forecast_v1'
WHERE status = 'forecasted' AND modeling_method IS NULL;

-- Backfill modeling_method for existing accuracy logs  
UPDATE forecast_accuracy_log
SET modeling_method = 'auren_forecast_v1'
WHERE modeling_method IS NULL OR modeling_method = 'unknown';

-- Add comment explaining the historical data preservation
COMMENT ON TABLE forecast_accuracy_log IS 'Historical accuracy tracking - never delete old records to track improvements over time';