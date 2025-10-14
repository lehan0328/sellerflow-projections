-- Add email_recipients column to notification_preferences
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS email_recipients TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN notification_preferences.email_recipients IS 'Array of email addresses to send notifications to';