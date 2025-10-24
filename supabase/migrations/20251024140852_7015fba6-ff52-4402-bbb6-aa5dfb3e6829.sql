-- Reset Amazon account sync status to re-sync with improved logic
-- This will allow the backfill to restart and fetch all transactions continuously

UPDATE amazon_accounts 
SET 
  initial_sync_complete = false,
  sync_status = 'idle',
  sync_progress = 0,
  sync_message = 'Ready to sync with improved continuous backfill'
WHERE user_id = '46b30370-1c11-4d1b-909e-5c276ce30cfd';