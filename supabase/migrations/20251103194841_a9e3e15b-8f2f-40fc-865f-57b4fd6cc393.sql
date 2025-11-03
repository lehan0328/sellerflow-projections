-- Add settlement date tracking columns to forecast_accuracy_log
ALTER TABLE forecast_accuracy_log 
ADD COLUMN IF NOT EXISTS settlement_close_date DATE,
ADD COLUMN IF NOT EXISTS settlement_period_start DATE,
ADD COLUMN IF NOT EXISTS settlement_period_end DATE,
ADD COLUMN IF NOT EXISTS days_accumulated INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS forecasted_amounts_by_day JSONB;

-- Update existing records with settlement data where available
UPDATE forecast_accuracy_log fal
SET 
  settlement_close_date = (ap.raw_settlement_data->>'FinancialEventGroupEnd')::date,
  settlement_period_start = (ap.raw_settlement_data->>'FinancialEventGroupStart')::date,
  settlement_period_end = (ap.raw_settlement_data->>'FinancialEventGroupEnd')::date,
  days_accumulated = CASE
    WHEN ap.raw_settlement_data->>'FinancialEventGroupStart' IS NOT NULL 
      AND ap.raw_settlement_data->>'FinancialEventGroupEnd' IS NOT NULL
    THEN GREATEST(1, EXTRACT(DAY FROM 
      (ap.raw_settlement_data->>'FinancialEventGroupEnd')::timestamp - 
      (ap.raw_settlement_data->>'FinancialEventGroupStart')::timestamp
    )::integer)
    ELSE 1
  END
FROM amazon_payouts ap
WHERE fal.settlement_id = ap.settlement_id
  AND ap.raw_settlement_data IS NOT NULL
  AND fal.settlement_close_date IS NULL;