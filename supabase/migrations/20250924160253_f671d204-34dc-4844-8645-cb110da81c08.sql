-- Add columns to vendors table to store purchase order details
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS po_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS payment_schedule JSONB;