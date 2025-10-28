-- Add last_report_sync column to track report sync frequency for daily accounts
ALTER TABLE amazon_accounts
ADD COLUMN IF NOT EXISTS last_report_sync TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN amazon_accounts.last_report_sync IS 'Last time order reports with delivery dates were synced (for daily accounts, twice per day)';
