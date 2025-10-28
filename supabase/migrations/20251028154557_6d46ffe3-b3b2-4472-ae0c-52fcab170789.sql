-- Add bulk_transaction_sync_complete flag to amazon_accounts
ALTER TABLE amazon_accounts 
ADD COLUMN IF NOT EXISTS bulk_transaction_sync_complete BOOLEAN DEFAULT FALSE;

-- Reset this flag for existing accounts to trigger the bulk sync
UPDATE amazon_accounts 
SET bulk_transaction_sync_complete = FALSE 
WHERE bulk_transaction_sync_complete IS NULL;