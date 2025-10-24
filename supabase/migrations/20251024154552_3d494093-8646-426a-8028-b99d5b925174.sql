-- Create sample Amazon account for chuandy11113 that meets forecast requirements
INSERT INTO amazon_accounts (
  user_id,
  account_id,
  seller_id,
  marketplace_id,
  marketplace_name,
  account_name,
  initial_sync_complete,
  transaction_count,
  created_at,
  is_active,
  payout_model,
  sync_status
) VALUES (
  '514bb5ae-8645-4e4f-94bd-8701a156a8ee',
  '54ca6953-5f8b-4104-b5bc-470b30c2b6f3',
  'SAMPLE_SELLER_ID',
  'ATVPDKIKX0DER',
  'United States',
  'Sample Amazon Account (Forecast Ready)',
  true,
  100,
  NOW() - INTERVAL '48 hours',
  true,
  'bi-weekly',
  'idle'
);