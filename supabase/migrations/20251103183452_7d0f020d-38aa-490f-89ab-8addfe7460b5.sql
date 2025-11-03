-- First, delete duplicate entries, keeping only the most recent one for each settlement_id
DELETE FROM forecast_accuracy_log 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY settlement_id ORDER BY created_at DESC) as row_num
    FROM forecast_accuracy_log
  ) t
  WHERE t.row_num > 1
);

-- Now add unique constraint on settlement_id to prevent future duplicates
ALTER TABLE forecast_accuracy_log 
ADD CONSTRAINT forecast_accuracy_log_settlement_id_key 
UNIQUE (settlement_id);