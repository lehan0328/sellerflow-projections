-- Insert sample bank account with $50k for testing
INSERT INTO public.bank_accounts (
  user_id,
  institution_name,
  account_name,
  account_type,
  account_id,
  balance,
  available_balance,
  currency_code,
  is_active,
  last_sync
) VALUES (
  '514bb5ae-8645-4e4f-94bd-8701a156a8ee',
  'Sample Bank',
  'Checking Account',
  'depository',
  'sample_bank_' || gen_random_uuid()::text,
  50000.00,
  50000.00,
  'USD',
  true,
  NOW()
);