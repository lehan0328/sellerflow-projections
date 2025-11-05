-- Add document_id column to purchase_order_line_items to link with documents_metadata
ALTER TABLE purchase_order_line_items 
ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES documents_metadata(id) ON DELETE CASCADE;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_line_items_document_id 
ON purchase_order_line_items(document_id);

-- Add description column to purchase_order_line_items for flexibility
ALTER TABLE purchase_order_line_items 
ADD COLUMN IF NOT EXISTS description text;