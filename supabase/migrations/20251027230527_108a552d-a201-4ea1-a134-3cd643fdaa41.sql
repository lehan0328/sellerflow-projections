-- Add last_settlement_sync_date to track incremental settlement syncing
-- This allows us to only fetch new settlements after initial 2-year load
ALTER TABLE amazon_accounts
ADD COLUMN IF NOT EXISTS last_settlement_sync_date timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN amazon_accounts.last_settlement_sync_date IS 
'Tracks the last FinancialEventGroupEnd date synced. Used for incremental settlement fetching to avoid re-fetching full history every sync.';