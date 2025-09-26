-- Add source field to vendors table to distinguish between purchase order vendors and management vendors
ALTER TABLE public.vendors 
ADD COLUMN source text DEFAULT 'management' CHECK (source IN ('purchase_order', 'management'));