-- Add columns for mathematical payout modeling

-- Add payout model and reserve settings to amazon_accounts
ALTER TABLE amazon_accounts 
ADD COLUMN IF NOT EXISTS payout_model TEXT NOT NULL DEFAULT 'bi-weekly' CHECK (payout_model IN ('bi-weekly', 'daily')),
ADD COLUMN IF NOT EXISTS reserve_lag_days INTEGER NOT NULL DEFAULT 7,
ADD COLUMN IF NOT EXISTS reserve_multiplier NUMERIC NOT NULL DEFAULT 1.0;

-- Add detailed transaction data for Net_i calculations to amazon_transactions
ALTER TABLE amazon_transactions
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS gross_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ads_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS return_rate NUMERIC DEFAULT 0.02 CHECK (return_rate >= 0 AND return_rate <= 1),
ADD COLUMN IF NOT EXISTS chargeback_rate NUMERIC DEFAULT 0.005 CHECK (chargeback_rate >= 0 AND chargeback_rate <= 1),
ADD COLUMN IF NOT EXISTS net_amount NUMERIC,
ADD COLUMN IF NOT EXISTS unlock_date DATE;

-- Add reserve and modeling settings to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS default_reserve_lag_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS min_reserve_floor NUMERIC DEFAULT 1000;

-- Add forecast metadata to amazon_payouts
ALTER TABLE amazon_payouts
ADD COLUMN IF NOT EXISTS eligible_in_period NUMERIC,
ADD COLUMN IF NOT EXISTS reserve_amount NUMERIC,
ADD COLUMN IF NOT EXISTS adjustments NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS modeling_method TEXT CHECK (modeling_method IN ('mathematical_biweekly', 'mathematical_daily', 'ai_forecast', 'baseline_estimate'));

COMMENT ON COLUMN amazon_accounts.payout_model IS 'Forecast model: bi-weekly (14-day settlements) or daily (available-to-withdraw)';
COMMENT ON COLUMN amazon_accounts.reserve_lag_days IS 'DD+L reserve policy (default 7 days post-delivery)';
COMMENT ON COLUMN amazon_transactions.delivery_date IS 'Order delivery date for DD+7 reserve calculation';
COMMENT ON COLUMN amazon_transactions.net_amount IS 'Calculated: (gross - fees - shipping - ads) * (1 - return_rate) * (1 - chargeback_rate)';
COMMENT ON COLUMN amazon_transactions.unlock_date IS 'Calculated: delivery_date + reserve_lag_days';
COMMENT ON COLUMN amazon_payouts.eligible_in_period IS 'Sum of eligible cash in settlement period';
COMMENT ON COLUMN amazon_payouts.reserve_amount IS 'Modeled reserve held by Amazon';
COMMENT ON COLUMN amazon_payouts.modeling_method IS 'Forecasting method used';