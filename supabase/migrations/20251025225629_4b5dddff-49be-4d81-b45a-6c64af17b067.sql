-- Update daily forecast regeneration to run at 6am EST (11am UTC)
SELECT cron.unschedule('regenerate-daily-forecasts');

SELECT cron.schedule(
  'regenerate-daily-forecasts',
  '0 11 * * *', -- Every day at 11 AM UTC (6 AM EST)
  $$
  SELECT
    net.http_post(
        url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/regenerate-all-forecasts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);