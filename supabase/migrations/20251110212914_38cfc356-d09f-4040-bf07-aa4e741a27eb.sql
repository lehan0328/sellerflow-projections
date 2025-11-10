-- Add action_url column to notification_history table
ALTER TABLE notification_history
ADD COLUMN IF NOT EXISTS action_url text;

-- Add comment to describe the column
COMMENT ON COLUMN notification_history.action_url IS 'URL for action button in notification';
