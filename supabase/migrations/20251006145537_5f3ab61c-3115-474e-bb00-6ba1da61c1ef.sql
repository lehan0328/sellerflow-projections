-- Add sample vendors
INSERT INTO vendors (user_id, name, category, total_owed, next_payment_amount, next_payment_date, status, payment_type)
SELECT 
  auth.uid(),
  'Acme Supplier',
  'Inventory',
  15000,
  5000,
  CURRENT_DATE + interval '7 days',
  'upcoming',
  'installment'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO vendors (user_id, name, category, total_owed, next_payment_amount, next_payment_date, status, payment_type)
SELECT 
  auth.uid(),
  'Tech Services Inc',
  'Services',
  8000,
  2000,
  CURRENT_DATE + interval '14 days',
  'upcoming',
  'installment'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO vendors (user_id, name, category, total_owed, next_payment_amount, next_payment_date, status, payment_type)
SELECT 
  auth.uid(),
  'Office Supplies Co',
  'Operating Expenses',
  3500,
  3500,
  CURRENT_DATE + interval '21 days',
  'upcoming',
  'total'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add sample income
INSERT INTO income (user_id, description, amount, payment_date, status, source, category)
SELECT 
  auth.uid(),
  'Client Payment - Project A',
  12000,
  CURRENT_DATE - interval '10 days',
  'received',
  'Client Payment',
  'Consulting'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO income (user_id, description, amount, payment_date, status, source, category)
SELECT 
  auth.uid(),
  'Client Payment - Project B',
  8500,
  CURRENT_DATE - interval '5 days',
  'received',
  'Client Payment',
  'Consulting'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO income (user_id, description, amount, payment_date, status, source, category)
SELECT 
  auth.uid(),
  'Pending Invoice Payment',
  6000,
  CURRENT_DATE + interval '7 days',
  'pending',
  'Client Payment',
  'Consulting'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO income (user_id, description, amount, payment_date, status, source, category)
SELECT 
  auth.uid(),
  'Monthly Retainer - Client C',
  4500,
  CURRENT_DATE + interval '14 days',
  'pending',
  'Recurring',
  'Retainer'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;