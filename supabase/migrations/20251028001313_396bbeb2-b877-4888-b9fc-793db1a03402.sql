-- Add sync notification preference column to amazon_accounts
ALTER TABLE amazon_accounts 
ADD COLUMN IF NOT EXISTS sync_notifications_enabled BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN amazon_accounts.sync_notifications_enabled IS 'Whether to send email notifications when sync completes';