-- Add progress tracking columns to amazon_accounts
ALTER TABLE amazon_accounts 
ADD COLUMN IF NOT EXISTS sync_progress INTEGER DEFAULT 0 CHECK (sync_progress >= 0 AND sync_progress <= 100),
ADD COLUMN IF NOT EXISTS sync_message TEXT DEFAULT NULL;

-- Enable realtime for amazon_accounts table
ALTER TABLE amazon_accounts REPLICA IDENTITY FULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_amazon_accounts_user_sync ON amazon_accounts(user_id, sync_status);