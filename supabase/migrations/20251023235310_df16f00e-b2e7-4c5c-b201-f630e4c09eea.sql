-- Schedule Amazon sync to run every 2 hours
SELECT cron.schedule(
  'amazon-sync-every-2-hours',
  '0 */2 * * *', -- Every 2 hours at the top of the hour
  $$
  SELECT
    net.http_post(
        url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-amazon-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);