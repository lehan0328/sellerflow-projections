-- Update bank sync schedule from hourly to every 3 hours
SELECT cron.unschedule('hourly-bank-transaction-sync');

SELECT cron.schedule(
  'three-hourly-bank-transaction-sync',
  '0 */3 * * *', -- Every 3 hours
  $$
  SELECT
    net.http_post(
        url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-bank-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Create function to cleanup old bank transactions (older than 45 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_bank_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff_date DATE;
  v_deleted_count INTEGER;
BEGIN
  -- Calculate cutoff date (45 days ago)
  v_cutoff_date := CURRENT_DATE - INTERVAL '45 days';
  
  -- Delete transactions older than 45 days
  WITH deleted AS (
    DELETE FROM bank_transactions
    WHERE date < v_cutoff_date
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  -- Log the cleanup
  RAISE NOTICE 'Deleted % bank transactions older than %', v_deleted_count, v_cutoff_date;
END;
$$;

-- Schedule daily cleanup of old bank transactions
SELECT cron.schedule(
  'daily-bank-transaction-cleanup',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT public.cleanup_old_bank_transactions();
  $$
);