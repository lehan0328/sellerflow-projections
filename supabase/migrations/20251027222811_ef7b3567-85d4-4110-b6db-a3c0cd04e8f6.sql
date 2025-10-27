-- Unschedule existing bank sync jobs
DO $$ 
BEGIN
  PERFORM cron.unschedule('sync-bank-transactions-every-3-hours');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  PERFORM cron.unschedule('three-hourly-bank-transaction-sync');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  PERFORM cron.unschedule('sync-bank-accounts-every-3-hours');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create new daily bank sync schedule at 2am UTC
SELECT cron.schedule(
  'daily-bank-sync',
  '0 2 * * *', -- Once daily at 2am UTC
  $$
  SELECT
    net.http_post(
        url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-bank-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);