-- Drop existing cron job if it exists
DO $$ 
BEGIN
  PERFORM cron.unschedule('scheduled-amazon-sync-12h');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create cron job to run every 12 hours (at 6am and 6pm UTC)
SELECT cron.schedule(
  'scheduled-amazon-sync-12h',
  '0 6,18 * * *', -- Run at 6am and 6pm UTC (12-hour intervals)
  $$
  SELECT
    net.http_post(
        url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-amazon-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
