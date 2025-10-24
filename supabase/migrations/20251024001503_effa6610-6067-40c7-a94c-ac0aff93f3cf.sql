-- Clean up duplicate Amazon sync cron jobs - keep only the 5-minute one
-- Remove all old jobs
SELECT cron.unschedule('scheduled-amazon-sync-frequent');
SELECT cron.unschedule('sync-amazon-accounts-every-3-hours');
SELECT cron.unschedule('amazon-sync-6hour');
SELECT cron.unschedule('scheduled-amazon-sync-every-12-hours');
SELECT cron.unschedule('sync-amazon-noon');
SELECT cron.unschedule('sync-amazon-midnight');