-- Drop the existing constraint that doesn't include 'expense'
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add new constraint with 'expense' included as a valid type
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('purchase_order', 'sales_order', 'vendor_payment', 'customer_payment', 'expense'));