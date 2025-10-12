-- Add chart preferences for forecast payout line to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS chart_show_forecast_line boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS chart_forecast_color text DEFAULT '#a855f7';