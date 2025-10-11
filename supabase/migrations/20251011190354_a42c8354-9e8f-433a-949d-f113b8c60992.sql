-- Add last_forecast_refresh column to user_settings table
ALTER TABLE user_settings 
ADD COLUMN last_forecast_refresh timestamp with time zone;