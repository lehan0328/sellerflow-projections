-- Restore the Alibaba vendor with correct payment type
INSERT INTO vendors (user_id, name, total_owed, next_payment_date, next_payment_amount, status, category, payment_type, net_terms_days, po_name, description, notes, payment_schedule)
VALUES (
  '8ecf98e9-e833-435d-9967-c711bed5c3d0',
  'Alibaba',
  5000.00,
  '2025-09-26',
  5000.00,
  'upcoming',
  'Inventory Purchase',
  'total',
  30,
  'Ali-101',
  'Amazon Inventory',
  '',
  '[]'
);