-- Reset sync status for incomplete backfills
UPDATE amazon_accounts 
SET 
  initial_sync_complete = false,
  backfill_complete = false,
  sync_status = 'idle',
  sync_message = '⏳ Ready to resume backfill - run sync to continue'
WHERE user_id = '46b30370-1c11-4d1b-909e-5c276ce30cfd'
  AND initial_sync_complete = true
  AND backfill_complete = false;