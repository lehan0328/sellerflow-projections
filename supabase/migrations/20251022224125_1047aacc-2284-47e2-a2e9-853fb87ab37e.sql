-- Remove the incorrect schedule
SELECT cron.unschedule('sync-bank-accounts-optimized');

-- Create correct schedule that skips 12am-6am EST (5am-11am UTC)
-- Run at: 0, 3, 12, 15, 18, 21 UTC (7pm, 10pm, 7am, 10am, 1pm, 4pm EST)
SELECT cron.schedule(
  'sync-bank-accounts-optimized',
  '0 0,3,12,15,18,21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-bank-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);