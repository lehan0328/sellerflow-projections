-- Schedule bank account sync every 3 hours
-- Note: pg_cron and pg_net extensions should already be enabled in Supabase
SELECT cron.schedule(
  'sync-bank-accounts-every-3-hours',
  '0 */3 * * *', -- Every 3 hours at minute 0 (12am, 3am, 6am, 9am, 12pm, 3pm, 6pm, 9pm)
  $$
  SELECT net.http_post(
    url := 'https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-bank-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);