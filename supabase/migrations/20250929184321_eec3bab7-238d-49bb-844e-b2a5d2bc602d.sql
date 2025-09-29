-- Add customer_id column to income table to track which customer the income is from
ALTER TABLE public.income
ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX idx_income_customer_id ON public.income(customer_id);