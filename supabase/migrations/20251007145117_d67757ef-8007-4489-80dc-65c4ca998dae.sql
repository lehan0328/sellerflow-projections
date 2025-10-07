-- Add safe_spending_reserve column to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS safe_spending_reserve NUMERIC DEFAULT 0;

-- Update existing records to have 0 reserve if null
UPDATE user_settings 
SET safe_spending_reserve = 0 
WHERE safe_spending_reserve IS NULL;