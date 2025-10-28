-- Force re-sync of missing dates (Oct 26 and gaps)
UPDATE amazon_accounts 
SET 
  last_synced_to = '2025-09-24T00:00:00Z',
  sync_status = 'idle',
  sync_progress = 50,
  sync_message = 'Re-syncing missing dates',
  initial_sync_complete = false
WHERE id = 'cee3e4be-ed8e-466f-aaf6-f4992c0c0990';