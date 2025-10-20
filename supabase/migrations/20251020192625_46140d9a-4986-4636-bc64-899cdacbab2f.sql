-- Add daily payout tracking to amazon_accounts
ALTER TABLE amazon_accounts 
ADD COLUMN IF NOT EXISTS uses_daily_payouts boolean DEFAULT false;

COMMENT ON COLUMN amazon_accounts.uses_daily_payouts IS 'True if account uses daily transfer/payout feature instead of only bi-weekly settlements';

-- Create table to track daily draws (transfers taken before settlement)
CREATE TABLE IF NOT EXISTS amazon_daily_draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid REFERENCES amazon_accounts(id) ON DELETE CASCADE,
  amazon_account_id uuid NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,
  
  -- Which settlement bucket this draw belongs to
  settlement_id text NOT NULL,
  settlement_period_start date NOT NULL,
  settlement_period_end date NOT NULL,
  
  -- Draw details
  draw_date date NOT NULL,
  amount numeric NOT NULL,
  
  -- Metadata
  notes text,
  raw_data jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_daily_draws_settlement ON amazon_daily_draws(settlement_id);
CREATE INDEX IF NOT EXISTS idx_daily_draws_account ON amazon_daily_draws(amazon_account_id);
CREATE INDEX IF NOT EXISTS idx_daily_draws_date ON amazon_daily_draws(draw_date);

-- Add RLS policies for daily draws
ALTER TABLE amazon_daily_draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view daily draws"
  ON amazon_daily_draws
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.account_id = amazon_daily_draws.account_id
    )
  );

CREATE POLICY "Account members can create daily draws"
  ON amazon_daily_draws
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.account_id = amazon_daily_draws.account_id
    )
  );

CREATE POLICY "Account members can update daily draws"
  ON amazon_daily_draws
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.account_id = amazon_daily_draws.account_id
    )
  );

CREATE POLICY "Account members can delete daily draws"
  ON amazon_daily_draws
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.account_id = amazon_daily_draws.account_id
    )
  );

-- Add fields to amazon_payouts to track draw adjustments
ALTER TABLE amazon_payouts
ADD COLUMN IF NOT EXISTS total_daily_draws numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_for_daily_transfer numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_draw_calculation_date date;

COMMENT ON COLUMN amazon_payouts.total_daily_draws IS 'Sum of all daily draws taken from this settlement bucket';
COMMENT ON COLUMN amazon_payouts.available_for_daily_transfer IS 'Amount currently available for daily transfer (eligible - reserve - draws)';
COMMENT ON COLUMN amazon_payouts.last_draw_calculation_date IS 'Last date the available transfer amount was calculated';

-- Update trigger for amazon_daily_draws
CREATE OR REPLACE FUNCTION update_amazon_daily_draws_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_amazon_daily_draws_updated_at
  BEFORE UPDATE ON amazon_daily_draws
  FOR EACH ROW
  EXECUTE FUNCTION update_amazon_daily_draws_updated_at();