-- Add columns to track sync window for continuation
ALTER TABLE amazon_accounts 
ADD COLUMN IF NOT EXISTS sync_window_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS sync_window_end timestamp with time zone;

COMMENT ON COLUMN amazon_accounts.sync_window_start IS 'Start of current sync date range (for pagination continuation)';
COMMENT ON COLUMN amazon_accounts.sync_window_end IS 'End of current sync date range (for pagination continuation)';