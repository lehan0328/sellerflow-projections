-- Insert sample bank transactions for Wells Fargo Business Checking
INSERT INTO bank_transactions (
  user_id,
  bank_account_id,
  plaid_transaction_id,
  amount,
  date,
  name,
  merchant_name,
  category,
  pending,
  payment_channel,
  transaction_type,
  currency_code
) VALUES
  -- Recent transactions (last week)
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'f257b629-4c3d-4c0b-85be-99e856f16f97', 'sample_tx_001', -45.67, '2025-10-10', 'Amazon.com', 'Amazon', ARRAY['Shopping', 'Online'], false, 'online', 'special', 'USD'),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'f257b629-4c3d-4c0b-85be-99e856f16f97', 'sample_tx_002', -125.00, '2025-10-09', 'Office Depot', 'Office Depot', ARRAY['Shops', 'Office Supplies'], false, 'in store', 'place', 'USD'),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'f257b629-4c3d-4c0b-85be-99e856f16f97', 'sample_tx_003', 2500.00, '2025-10-08', 'Client Payment - Invoice #1234', 'Client Payment', ARRAY['Transfer', 'Deposit'], false, 'online', 'special', 'USD'),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'f257b629-4c3d-4c0b-85be-99e856f16f97', 'sample_tx_004', -89.99, '2025-10-08', 'Google Workspace', 'Google', ARRAY['Service', 'Software'], false, 'online', 'online', 'USD'),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'f257b629-4c3d-4c0b-85be-99e856f16f97', 'sample_tx_005', -1250.00, '2025-10-07', 'Vendor Payment - ReGo Trading', 'ReGo Trading Inc.', ARRAY['Transfer', 'Payment'], false, 'online', 'special', 'USD'),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'f257b629-4c3d-4c0b-85be-99e856f16f97', 'sample_tx_006', -67.45, '2025-10-06', 'FedEx Shipping', 'FedEx', ARRAY['Shops', 'Shipping'], false, 'in store', 'place', 'USD'),
  
  -- This week pending
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'f257b629-4c3d-4c0b-85be-99e856f16f97', 'sample_tx_007', -234.56, '2025-10-11', 'Staples', 'Staples', ARRAY['Shops', 'Office Supplies'], true, 'in store', 'place', 'USD'),
  
  -- Bank of America Business Savings transactions
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'b2287539-1f79-4a27-86ff-1ca908004569', 'sample_tx_008', 5000.00, '2025-10-05', 'Transfer from Checking', 'Internal Transfer', ARRAY['Transfer', 'Deposit'], false, 'online', 'special', 'USD'),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'b2287539-1f79-4a27-86ff-1ca908004569', 'sample_tx_009', 12.50, '2025-10-01', 'Interest Payment', 'Bank of America', ARRAY['Bank Fees', 'Interest'], false, 'other', 'special', 'USD'),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'b2287539-1f79-4a27-86ff-1ca908004569', 'sample_tx_010', -2000.00, '2025-09-28', 'Transfer to Checking', 'Internal Transfer', ARRAY['Transfer', 'Withdrawal'], false, 'online', 'special', 'USD'),
  
  -- More Wells Fargo transactions (last month)
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'f257b629-4c3d-4c0b-85be-99e856f16f97', 'sample_tx_011', -450.00, '2025-09-25', 'Comcast Business', 'Comcast', ARRAY['Service', 'Telecommunications'], false, 'online', 'online', 'USD'),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'f257b629-4c3d-4c0b-85be-99e856f16f97', 'sample_tx_012', 3500.00, '2025-09-24', 'Client Payment - Invoice #1220', 'Client Payment', ARRAY['Transfer', 'Deposit'], false, 'online', 'special', 'USD'),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'f257b629-4c3d-4c0b-85be-99e856f16f97', 'sample_tx_013', -156.78, '2025-09-23', 'UPS Store', 'UPS', ARRAY['Shops', 'Shipping'], false, 'in store', 'place', 'USD'),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'f257b629-4c3d-4c0b-85be-99e856f16f97', 'sample_tx_014', -2000.00, '2025-09-20', 'Uncharted Digital - PPC', 'Uncharted Digital', ARRAY['Service', 'Advertising'], false, 'online', 'special', 'USD'),
  ('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'f257b629-4c3d-4c0b-85be-99e856f16f97', 'sample_tx_015', -75.00, '2025-09-18', 'Dropbox Business', 'Dropbox', ARRAY['Service', 'Software'], false, 'online', 'online', 'USD');