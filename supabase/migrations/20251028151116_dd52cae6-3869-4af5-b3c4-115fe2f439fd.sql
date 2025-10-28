-- Reset Amazon account sync to start fresh from 180 days ago
UPDATE amazon_accounts 
SET 
  last_synced_to = NULL,
  sync_next_token = NULL,
  sync_status = 'idle',
  sync_progress = 0,
  sync_message = 'Reset - will sync last 180 days',
  initial_sync_complete = false
WHERE id = 'cee3e4be-ed8e-466f-aaf6-f4992c0c0990';