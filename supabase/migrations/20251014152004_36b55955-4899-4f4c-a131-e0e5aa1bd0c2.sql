-- Add forecast_confidence_threshold column to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS forecast_confidence_threshold INTEGER DEFAULT 88 CHECK (forecast_confidence_threshold >= 80 AND forecast_confidence_threshold <= 95);