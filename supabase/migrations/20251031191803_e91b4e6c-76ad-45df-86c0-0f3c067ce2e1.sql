-- Update Amazon sync cron to run at 4am PST (12pm UTC) daily
SELECT cron.unschedule('amazon-sync-daily');

SELECT cron.schedule(
  'amazon-sync-daily',
  '0 12 * * *', -- 4am PST / 12pm UTC
  $$
  SELECT net.http_post(
    url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-amazon-sync',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb
  ) as request_id;
  $$
);