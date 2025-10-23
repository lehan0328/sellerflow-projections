-- Schedule Amazon sync job to run every 3 hours
SELECT cron.schedule(
  'sync-amazon-accounts-every-3-hours',
  '0 */3 * * *', -- Every 3 hours at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-amazon-sync',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMjQ3OTcsImV4cCI6MjA0OTcwMDc5N30.CfXvn6FV6BHRC4WVr-JqmjZTWEZEMeoxpRINELPdv6k"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);