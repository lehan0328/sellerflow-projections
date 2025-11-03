-- Recalculate all forecast_accuracy_log entries with correct MAPE formula
-- Old formula: (actual - forecast) / forecast * 100 (WRONG)
-- New formula: |actual - forecast| / actual * 100 (CORRECT)

UPDATE forecast_accuracy_log
SET difference_percentage = CASE
  WHEN actual_amount != 0 THEN
    (ABS(actual_amount - forecasted_amount) / actual_amount) * 100
  ELSE
    0
END
WHERE actual_amount IS NOT NULL 
  AND forecasted_amount IS NOT NULL;