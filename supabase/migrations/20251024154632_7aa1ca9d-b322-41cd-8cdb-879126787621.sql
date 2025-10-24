-- Create forecast payouts for chuandy11113
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
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', '54ca6953-5f8b-4104-b5bc-470b30c2b6f3', 'a8793648-c85d-4e1f-b926-5b17b4a332b7', 'FORECAST_001', CURRENT_DATE + 3, 8500, 'forecasted', 'bi-weekly', 'United States', 'USD', 0),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', '54ca6953-5f8b-4104-b5bc-470b30c2b6f3', 'a8793648-c85d-4e1f-b926-5b17b4a332b7', 'FORECAST_002', CURRENT_DATE + 17, 9200, 'forecasted', 'bi-weekly', 'United States', 'USD', 0),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', '54ca6953-5f8b-4104-b5bc-470b30c2b6f3', 'a8793648-c85d-4e1f-b926-5b17b4a332b7', 'FORECAST_003', CURRENT_DATE + 31, 8800, 'forecasted', 'bi-weekly', 'United States', 'USD', 0),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', '54ca6953-5f8b-4104-b5bc-470b30c2b6f3', 'a8793648-c85d-4e1f-b926-5b17b4a332b7', 'FORECAST_004', CURRENT_DATE + 45, 9500, 'forecasted', 'bi-weekly', 'United States', 'USD', 0),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', '54ca6953-5f8b-4104-b5bc-470b30c2b6f3', 'a8793648-c85d-4e1f-b926-5b17b4a332b7', 'FORECAST_005', CURRENT_DATE + 59, 9100, 'forecasted', 'bi-weekly', 'United States', 'USD', 0),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', '54ca6953-5f8b-4104-b5bc-470b30c2b6f3', 'a8793648-c85d-4e1f-b926-5b17b4a332b7', 'FORECAST_006', CURRENT_DATE + 73, 8900, 'forecasted', 'bi-weekly', 'United States', 'USD', 0);