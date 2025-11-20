-- ====================================
-- Monthly Support Metrics Cron Job Setup
-- ====================================
-- 
-- INSTRUCTIONS:
-- 1. Open your Supabase SQL Editor: https://supabase.com/dashboard/project/ruvdqtqyfzaxlobmxgaj/sql/new
-- 2. Copy and paste this entire SQL script
-- 3. Click "Run" to create the cron job
-- 
-- This will automatically save support metrics at the end of each month (midnight on the 1st)
-- ====================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the cron job to run on the 1st of each month at midnight
-- This captures the previous month's metrics
SELECT cron.schedule(
  'save-monthly-support-metrics',
  '0 0 1 * *', -- At midnight on the 1st of every month
  $$
  SELECT
    net.http_post(
        url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/save-monthly-support-metrics',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- To verify the cron job was created, run:
-- SELECT * FROM cron.job WHERE jobname = 'save-monthly-support-metrics';

-- To manually trigger the function (for testing), run:
-- SELECT
--   net.http_post(
--       url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/save-monthly-support-metrics',
--       headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
--       body:='{"time": "test"}'::jsonb
--   ) as request_id;

-- To delete the cron job (if needed), run:
-- SELECT cron.unschedule('save-monthly-support-metrics');
