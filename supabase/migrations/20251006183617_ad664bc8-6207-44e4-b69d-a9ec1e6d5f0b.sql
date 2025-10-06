-- Add remarks column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS remarks TEXT DEFAULT 'Ordered';

-- Add comment
COMMENT ON COLUMN public.transactions.remarks IS 'Status remarks for purchase orders (Ordered, Shipped, Delayed, Received)';