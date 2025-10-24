-- Reset Amazon account to trigger re-sync with NEW deployed code
-- Now that the improved edge function is deployed, this reset will use the correct logic

UPDATE amazon_accounts 
SET 
  initial_sync_complete = false,
  sync_status = 'idle',
  sync_progress = 0,
  sync_message = 'Ready for continuous forward backfill',
  last_sync = NOW() - INTERVAL '10 minutes'  -- Force re-sync in next cron cycle
WHERE user_id = '46b30370-1c11-4d1b-909e-5c276ce30cfd';