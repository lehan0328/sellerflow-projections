-- Create amazon_sync_logs table to track sync history
CREATE TABLE IF NOT EXISTS public.amazon_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.amazon_accounts(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'manual', 'scheduled', 'initial'
  sync_status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  transactions_synced INTEGER DEFAULT 0,
  payouts_synced INTEGER DEFAULT 0,
  error_message TEXT,
  sync_duration_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.amazon_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for amazon_sync_logs
CREATE POLICY "Users can view their own sync logs"
  ON public.amazon_sync_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert sync logs"
  ON public.amazon_sync_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update sync logs"
  ON public.amazon_sync_logs
  FOR UPDATE
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_amazon_sync_logs_user_id ON public.amazon_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_amazon_sync_logs_account_id ON public.amazon_sync_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_amazon_sync_logs_started_at ON public.amazon_sync_logs(started_at DESC);

-- Add comment
COMMENT ON TABLE public.amazon_sync_logs IS 'Historical log of Amazon account sync operations';