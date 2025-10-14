-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily Amazon payout forecast update at 2 AM UTC
SELECT cron.schedule(
  'daily-amazon-forecast-update',
  '0 2 * * *', -- Run at 2 AM UTC daily
  $$
  SELECT
    net.http_post(
      url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/forecast-amazon-payouts',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
      body:=json_build_object(
        'userId', user_id
      )::jsonb
    ) AS request_id
  FROM (
    SELECT DISTINCT user_id 
    FROM amazon_accounts 
    WHERE is_active = true
  ) AS active_users;
  $$
);