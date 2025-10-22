-- Remove the current schedule
SELECT cron.unschedule('sync-bank-accounts-optimized');

-- Create schedule for 6am, 9am, 12pm, 3pm, 6pm, 9pm EST
-- In UTC: 11am, 2pm, 5pm, 8pm, 11pm, 2am
SELECT cron.schedule(
  'sync-bank-accounts-optimized',
  '0 2,11,14,17,20,23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-bank-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);