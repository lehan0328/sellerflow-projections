-- Add 3 sample credit cards for chuandy914@gmail.com
INSERT INTO credit_cards (user_id, institution_name, account_name, account_type, balance, statement_balance, credit_limit, available_credit, currency_code, minimum_payment, payment_due_date, statement_close_date, annual_fee, cash_back, priority, is_active, last_sync)
VALUES 
('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'Chase', 'Chase Sapphire Reserve', 'credit', 3250.00, 3250.00, 15000.00, 11750.00, 'USD', 97.50, '2025-11-05', '2025-10-25', 550.00, 3.0, 1, true, NOW()),
('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'American Express', 'Amex Business Gold', 'credit', 5840.00, 5840.00, 25000.00, 19160.00, 'USD', 175.20, '2025-11-12', '2025-10-28', 295.00, 4.0, 2, true, NOW()),
('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'Capital One', 'Venture X', 'credit', 1680.00, 1680.00, 10000.00, 8320.00, 'USD', 50.40, '2025-11-08', '2025-10-22', 395.00, 2.0, 3, true, NOW());

-- Add 2 demo bank accounts for chuandy914@gmail.com
INSERT INTO bank_accounts (user_id, institution_name, account_name, account_type, account_id, balance, available_balance, currency_code, is_active, last_sync)
VALUES 
('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'Wells Fargo', 'Business Checking', 'checking', 'wf_checking_001', 48750.00, 48750.00, 'USD', true, NOW()),
('514bb5ae-8645-4e4f-94bd-8701a156a8ee', 'Bank of America', 'Business Savings', 'savings', 'boa_savings_001', 125000.00, 125000.00, 'USD', true, NOW());