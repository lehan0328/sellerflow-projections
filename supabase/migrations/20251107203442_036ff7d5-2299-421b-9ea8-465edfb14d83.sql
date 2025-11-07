-- Add missing description column to purchase_order_line_items
ALTER TABLE purchase_order_line_items 
ADD COLUMN IF NOT EXISTS description TEXT;