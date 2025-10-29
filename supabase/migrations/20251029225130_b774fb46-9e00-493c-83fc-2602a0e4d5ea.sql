
-- Schedule daily cash-out sync to run every day at 12:05 AM UTC
-- Note: pg_cron extension should already be enabled in Supabase
SELECT cron.schedule(
  'daily-cashout-sync',
  '5 0 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-daily-cashout-sync',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
