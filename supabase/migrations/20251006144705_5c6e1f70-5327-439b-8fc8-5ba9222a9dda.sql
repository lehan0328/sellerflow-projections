-- Add safe spending percentage to user settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS safe_spending_percentage integer DEFAULT 20 CHECK (safe_spending_percentage >= 0 AND safe_spending_percentage <= 70);