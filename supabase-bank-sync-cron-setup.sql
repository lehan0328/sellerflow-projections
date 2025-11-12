-- ====================================
-- Bank/Credit Card Sync Cron Job Setup
-- ====================================
-- 
-- INSTRUCTIONS:
-- 1. Open your Supabase SQL Editor: https://supabase.com/dashboard/project/ruvdqtqyfzaxlobmxgaj/sql/new
-- 2. Copy and paste this entire SQL script
-- 3. Click "Run" to create the cron job
-- 
-- This will automatically sync bank and credit card transactions every 6 hours
-- ====================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the cron job to run every 6 hours
SELECT cron.schedule(
  'scheduled-bank-sync',
  '0 */6 * * *', -- At minute 0 past every 6th hour (00:00, 06:00, 12:00, 18:00)
  $$
  SELECT
    net.http_post(
        url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-bank-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- To verify the cron job was created, run:
-- SELECT * FROM cron.job WHERE jobname = 'scheduled-bank-sync';

-- To manually trigger the function (for testing), run:
-- SELECT
--   net.http_post(
--       url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-bank-sync',
--       headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
--       body:='{"time": "test"}'::jsonb
--   ) as request_id;

-- To delete the cron job (if needed), run:
-- SELECT cron.unschedule('scheduled-bank-sync');
