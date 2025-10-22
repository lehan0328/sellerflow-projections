-- Remove only the cron job that exists
SELECT cron.unschedule('sync-bank-accounts-twice-daily');

-- Create new schedule for bank sync every 3 hours, skipping 6am-12pm EST (11am-5pm UTC)
-- Run at: 12am, 3am, 6am, 9am, 6pm, 9pm UTC (7pm, 10pm, 1am, 4am, 1pm, 4pm EST)
SELECT cron.schedule(
  'sync-bank-accounts-optimized',
  '0 0,3,6,9,18,21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-bank-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);