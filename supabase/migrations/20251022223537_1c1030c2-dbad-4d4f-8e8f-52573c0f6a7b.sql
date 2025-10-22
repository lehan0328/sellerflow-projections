-- Remove existing 3-hour bank sync schedule
SELECT cron.unschedule('sync-bank-accounts-every-3-hours');
SELECT cron.unschedule('three-hourly-bank-transaction-sync');

-- Create new schedule for bank sync only at 6am and 6pm EST (11am and 11pm UTC)
SELECT cron.schedule(
  'sync-bank-accounts-twice-daily',
  '0 11,23 * * *', -- 11am and 11pm UTC (6am and 6pm EST)
  $$
  SELECT net.http_post(
    url := 'https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-bank-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);