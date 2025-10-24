-- Enable forecasts for the CORRECT chuandy11113 user
UPDATE user_settings 
SET 
  forecasts_enabled = true,
  forecast_confidence_threshold = 8,
  forecasts_disabled_at = NULL,
  updated_at = NOW()
WHERE user_id = 'd4eb9f5c-3aeb-45ad-90ce-871b502cf0d6';

-- Create forecasted payouts without modeling_method
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
  ('d4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', 'be7616d6-43e1-43dd-80b2-63941bb2467a', 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc', 'FORECAST_001', CURRENT_DATE + 3, 12500, 'forecasted', 'bi-weekly', 'Amazon.com', 'USD', 0),
  ('d4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', 'be7616d6-43e1-43dd-80b2-63941bb2467a', 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc', 'FORECAST_002', CURRENT_DATE + 17, 13200, 'forecasted', 'bi-weekly', 'Amazon.com', 'USD', 0),
  ('d4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', 'be7616d6-43e1-43dd-80b2-63941bb2467a', 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc', 'FORECAST_003', CURRENT_DATE + 31, 11800, 'forecasted', 'bi-weekly', 'Amazon.com', 'USD', 0),
  ('d4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', 'be7616d6-43e1-43dd-80b2-63941bb2467a', 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc', 'FORECAST_004', CURRENT_DATE + 45, 13500, 'forecasted', 'bi-weekly', 'Amazon.com', 'USD', 0),
  ('d4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', 'be7616d6-43e1-43dd-80b2-63941bb2467a', 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc', 'FORECAST_005', CURRENT_DATE + 59, 12100, 'forecasted', 'bi-weekly', 'Amazon.com', 'USD', 0),
  ('d4eb9f5c-3aeb-45ad-90ce-871b502cf0d6', 'be7616d6-43e1-43dd-80b2-63941bb2467a', 'f2e71cd1-a63f-4f90-9bce-ce915d4effbc', 'FORECAST_006', CURRENT_DATE + 73, 12900, 'forecasted', 'bi-weekly', 'Amazon.com', 'USD', 0);