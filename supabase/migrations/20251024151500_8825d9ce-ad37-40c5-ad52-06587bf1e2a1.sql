-- Add two-tier Amazon data model for scalable sync
-- This implements the architecture from the requirements document

-- Add sync state tracking fields to amazon_accounts
ALTER TABLE amazon_accounts ADD COLUMN IF NOT EXISTS last_synced_to TIMESTAMP WITH TIME ZONE;
ALTER TABLE amazon_accounts ADD COLUMN IF NOT EXISTS sync_next_token TEXT;
ALTER TABLE amazon_accounts ADD COLUMN IF NOT EXISTS initial_sync_complete BOOLEAN DEFAULT false;
ALTER TABLE amazon_accounts ADD COLUMN IF NOT EXISTS backfill_complete BOOLEAN DEFAULT false;
ALTER TABLE amazon_accounts ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'idle';
ALTER TABLE amazon_accounts ADD COLUMN IF NOT EXISTS sync_progress INTEGER DEFAULT 0;
ALTER TABLE amazon_accounts ADD COLUMN IF NOT EXISTS sync_message TEXT;
ALTER TABLE amazon_accounts ADD COLUMN IF NOT EXISTS last_sync_error TEXT;
ALTER TABLE amazon_accounts ADD COLUMN IF NOT EXISTS rate_limited_until TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN amazon_accounts.last_synced_to IS 'Last date successfully synced - used for incremental daily windows';
COMMENT ON COLUMN amazon_accounts.sync_next_token IS 'Amazon API pagination token for resuming';
COMMENT ON COLUMN amazon_accounts.rate_limited_until IS 'Timestamp when rate limit expires';

-- Create daily rollups table for aggregated data (>30 days old)
CREATE TABLE IF NOT EXISTS public.amazon_daily_rollups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID,
  amazon_account_id UUID NOT NULL REFERENCES public.amazon_accounts(id) ON DELETE CASCADE,
  rollup_date DATE NOT NULL,
  
  -- Aggregated metrics
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_fees NUMERIC DEFAULT 0,
  total_refunds NUMERIC DEFAULT 0,
  total_net NUMERIC DEFAULT 0,
  
  -- Transaction counts by type
  order_count INTEGER DEFAULT 0,
  refund_count INTEGER DEFAULT 0,
  adjustment_count INTEGER DEFAULT 0,
  fee_count INTEGER DEFAULT 0,
  
  currency_code TEXT NOT NULL DEFAULT 'USD',
  marketplace_name TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure one rollup per account per day
  UNIQUE(amazon_account_id, rollup_date)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_daily_rollups_account_date ON amazon_daily_rollups(amazon_account_id, rollup_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_rollups_user_date ON amazon_daily_rollups(user_id, rollup_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_rollups_account_id ON amazon_daily_rollups(account_id);

-- Enable RLS
ALTER TABLE amazon_daily_rollups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for daily_rollups
CREATE POLICY "Users can view their own daily rollups" 
ON amazon_daily_rollups FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own daily rollups" 
ON amazon_daily_rollups FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own daily rollups" 
ON amazon_daily_rollups FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own daily rollups" 
ON amazon_daily_rollups FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Add updated_at trigger for daily_rollups
CREATE TRIGGER update_daily_rollups_updated_at
  BEFORE UPDATE ON amazon_daily_rollups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index on amazon_transactions for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_amazon_transactions_date_account 
ON amazon_transactions(amazon_account_id, transaction_date DESC);

-- Add a marker field to identify compacted transactions
ALTER TABLE amazon_transactions ADD COLUMN IF NOT EXISTS is_compacted BOOLEAN DEFAULT false;

COMMENT ON TABLE amazon_daily_rollups IS 'Aggregated daily summaries for Amazon transactions older than 30 days - used for efficient storage and trend analysis';
COMMENT ON COLUMN amazon_transactions.is_compacted IS 'Marks transactions that have been aggregated into daily_rollups and can be deleted';
