-- Reset sync to use new unlimited extraction logic
UPDATE amazon_accounts 
SET 
  initial_sync_complete = false,
  sync_status = 'idle',
  sync_progress = 0,
  sync_message = 'Ready for unlimited continuous sync',
  last_sync = NOW() - INTERVAL '10 minutes'
WHERE user_id = '46b30370-1c11-4d1b-909e-5c276ce30cfd';