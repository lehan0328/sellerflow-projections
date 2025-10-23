-- Create cron job for Amazon sync every 6 hours
-- This will run at 00:00, 06:00, 12:00, and 18:00 daily
SELECT cron.schedule(
  'amazon-sync-6hour',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-amazon-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
        body:=concat('{"scheduled_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);