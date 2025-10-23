-- Schedule Amazon sync to run every 12 hours (pg_cron extension is already enabled)
-- First, try to unschedule if it exists (will silently fail if not exists)
DO $$
BEGIN
    PERFORM cron.unschedule('scheduled-amazon-sync-every-12-hours');
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore error if job doesn't exist
END $$;

-- Schedule Amazon sync to run every 12 hours
-- This will run at midnight and noon UTC every day
SELECT cron.schedule(
  'scheduled-amazon-sync-every-12-hours',
  '0 */12 * * *', -- Every 12 hours (at minute 0 of every 12th hour)
  $$
  SELECT
    net.http_post(
      url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-amazon-sync',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);