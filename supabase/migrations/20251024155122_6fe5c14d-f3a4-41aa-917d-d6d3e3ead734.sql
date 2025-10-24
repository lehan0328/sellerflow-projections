
-- Fix chuandy11113 account - Enable forecasts and update Amazon account
UPDATE user_settings 
SET 
  forecasts_enabled = true,
  forecast_confidence_threshold = 8,
  forecasts_disabled_at = NULL,
  updated_at = NOW()
WHERE user_id = 'd4eb9f5c-3aeb-45ad-90ce-871b502cf0d6';

-- Update Amazon account to have correct transaction count and older created_at
UPDATE amazon_accounts
SET
  transaction_count = (SELECT COUNT(*) FROM amazon_transactions WHERE amazon_account_id = 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc'),
  created_at = NOW() - INTERVAL '48 hours',
  initial_sync_complete = true,
  updated_at = NOW()
WHERE id = 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc';

-- Delete any existing forecasts
DELETE FROM amazon_payouts 
WHERE user_id = 'd4eb9f5c-3aeb-45ad-90ce-871b502cf0d6' AND status = 'forecasted';

-- Add 100 sample Amazon transactions with varied dates over last 60 days
INSERT INTO amazon_transactions (
  user_id,
  account_id,
  amazon_account_id,
  transaction_id,
  transaction_type,
  transaction_date,
  amount,
  net_amount,
  settlement_id,
  marketplace_name,
  currency_code,
  delivery_date,
  unlock_date,
  created_at
)
SELECT
  'd4eb9f5c-3aeb-45ad-90ce-871b502cf0d6',
  'be7616d6-43e1-43dd-80b2-63941bb2467a',
  'f2e71cd1-a63f-4f90-9bce-ce915d4effbc',
  'SAMPLE_TXN_' || i::text,
  CASE WHEN i % 5 = 0 THEN 'Refund' WHEN i % 7 = 0 THEN 'Fee' ELSE 'Order' END,
  NOW() - (i || ' days')::interval,
  CASE WHEN i % 5 = 0 THEN -50.00 WHEN i % 7 = 0 THEN -5.00 ELSE (50 + (i % 200)) END,
  CASE WHEN i % 5 = 0 THEN -50.00 WHEN i % 7 = 0 THEN -5.00 ELSE (40 + (i % 180)) END,
  'SETTLEMENT_' || ((i / 14) + 1)::text,
  'Amazon.com',
  'USD',
  NOW() - (i || ' days')::interval,
  NOW() - ((i - 7) || ' days')::interval,
  NOW() - (i || ' days')::interval
FROM generate_series(1, 100) AS i;

-- Create 6 bi-weekly forecasted payouts
INSERT INTO amazon_payouts (
  user_id,
  account_id,
  amazon_account_id,
  settlement_id,
  payout_date,
  total_amount,
  status,
  payout_type,
  marketplace_name,
  currency_code,
  transaction_count
) VALUES
  ('d4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', 'be7616d6-43e1-43dd-80b2-63941bb2467a', 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc', 'FORECAST_' || gen_random_uuid()::text, CURRENT_DATE + 3, 12500, 'forecasted', 'bi-weekly', 'Amazon.com', 'USD', 0),
  ('d4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', 'be7616d6-43e1-43dd-80b2-63941bb2467a', 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc', 'FORECAST_' || gen_random_uuid()::text, CURRENT_DATE + 17, 13200, 'forecasted', 'bi-weekly', 'Amazon.com', 'USD', 0),
  ('d4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', 'be7616d6-43e1-43dd-80b2-63941bb2467a', 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc', 'FORECAST_' || gen_random_uuid()::text, CURRENT_DATE + 31, 11800, 'forecasted', 'bi-weekly', 'Amazon.com', 'USD', 0),
  ('d4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', 'be7616d6-43e1-43dd-80b2-63941bb2467a', 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc', 'FORECAST_' || gen_random_uuid()::text, CURRENT_DATE + 45, 13500, 'forecasted', 'bi-weekly', 'Amazon.com', 'USD', 0),
  ('d4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', 'be7616d6-43e1-43dd-80b2-63941bb2467a', 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc', 'FORECAST_' || gen_random_uuid()::text, CURRENT_DATE + 59, 12100, 'forecasted', 'bi-weekly', 'Amazon.com', 'USD', 0),
  ('d4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', 'be7616d6-43e1-43dd-80b2-63941bb2467a', 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc', 'FORECAST_' || gen_random_uuid()::text, CURRENT_DATE + 73, 12900, 'forecasted', 'bi-weekly', 'Amazon.com', 'USD', 0);
