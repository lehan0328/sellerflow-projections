-- Add sync_status column to amazon_accounts table
ALTER TABLE amazon_accounts 
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'completed', 'error'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_amazon_accounts_sync_status ON amazon_accounts(sync_status);