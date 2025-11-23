-- Step 1: Fix Daniel's payout model to match frequency
UPDATE amazon_accounts 
SET payout_model = 'daily'
WHERE id = '40524d5a-0ede-439e-a56f-d4ef18d1ec5c';

-- Step 2: Clear corrupted data for fresh start
DELETE FROM amazon_payouts
WHERE amazon_account_id = '40524d5a-0ede-439e-a56f-d4ef18d1ec5c';

DELETE FROM amazon_sync_logs
WHERE account_id = '40524d5a-0ede-439e-a56f-d4ef18d1ec5c';

-- Step 3: Reset sync state for complete 365-day historical re-sync
UPDATE amazon_accounts 
SET 
  initial_sync_complete = false,
  sync_next_token = null,
  last_synced_to = null,
  sync_status = 'idle',
  sync_progress = 0,
  sync_message = 'Ready for historical sync',
  last_sync = null
WHERE id = '40524d5a-0ede-439e-a56f-d4ef18d1ec5c';