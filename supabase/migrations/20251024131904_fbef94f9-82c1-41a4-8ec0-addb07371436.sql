-- Reset initial_sync_complete to false for all accounts to start proper backfill
-- This ensures all accounts go through the proper 90-day historical backfill process
UPDATE amazon_accounts
SET initial_sync_complete = false
WHERE initial_sync_complete = true;