-- Add column to track if Amazon account has completed initial sync with sufficient data
ALTER TABLE amazon_accounts ADD COLUMN IF NOT EXISTS initial_sync_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE amazon_accounts ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0;

-- Update existing accounts that have transactions as synced
UPDATE amazon_accounts
SET initial_sync_complete = TRUE,
    transaction_count = (
      SELECT COUNT(*) 
      FROM amazon_transactions 
      WHERE amazon_transactions.amazon_account_id = amazon_accounts.id
    )
WHERE EXISTS (
  SELECT 1 FROM amazon_transactions 
  WHERE amazon_transactions.amazon_account_id = amazon_accounts.id
  LIMIT 1
);