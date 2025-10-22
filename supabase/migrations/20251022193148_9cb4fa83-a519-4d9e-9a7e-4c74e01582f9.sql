-- Insert overdue purchase order for chuandy914@gmail.com
INSERT INTO transactions (
  user_id,
  account_id,
  type,
  amount,
  description,
  vendor_id,
  transaction_date,
  due_date,
  status,
  remarks
) VALUES (
  '514bb5ae-8645-4e4f-94bd-8701a156a8ee',
  '54ca6953-5f8b-4104-b5bc-470b30c2b6f3',
  'purchase_order',
  2500.00,
  'Inventory Purchase - Office Supplies',
  'bf1a2569-05ce-4a69-aa0b-987060dbf91c',
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE - INTERVAL '15 days',
  'pending',
  'Overdue - Payment Required'
);