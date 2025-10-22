-- Create scheduled job to sync bank transactions every hour
-- Note: pg_cron and pg_net extensions should already be enabled in Supabase
SELECT cron.schedule(
  'hourly-bank-transaction-sync',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://ruvdqtqyfzaxlobmxgaj.supabase.co/functions/v1/scheduled-bank-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmRxdHF5ZnpheGxvYm14Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTgwMzAsImV4cCI6MjA3NDIzNDAzMH0.BmAu8t517TOxd4kPwU2HlB14QUdCZSmXGcwad_ZKkrc"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Create a table to log sync results
CREATE TABLE IF NOT EXISTS bank_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  accounts_synced INTEGER NOT NULL DEFAULT 0,
  total_accounts INTEGER NOT NULL DEFAULT 0,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on sync logs
ALTER TABLE bank_sync_logs ENABLE ROW LEVEL SECURITY;

-- Admin policy for sync logs
CREATE POLICY "Admins can view sync logs"
ON bank_sync_logs
FOR SELECT
USING (has_admin_role(auth.uid()) OR is_website_admin());

COMMENT ON TABLE bank_sync_logs IS 'Logs for automatic hourly bank transaction syncs';
COMMENT ON COLUMN bank_sync_logs.sync_time IS 'When the sync was executed';
COMMENT ON COLUMN bank_sync_logs.accounts_synced IS 'Number of accounts successfully synced';
COMMENT ON COLUMN bank_sync_logs.total_accounts IS 'Total number of accounts attempted';