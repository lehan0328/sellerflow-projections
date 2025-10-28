
-- Unschedule existing 3-minute cron job
SELECT cron.unschedule('scheduled-amazon-sync');

-- Create new 1-minute cron job for faster backfill during initial sync
SELECT cron.schedule(
  'scheduled-amazon-sync',
  '* * * * *', -- Every 1 minute (changed from */3)
  $$
  SELECT
    net.http_post(
      url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-amazon-sync',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
