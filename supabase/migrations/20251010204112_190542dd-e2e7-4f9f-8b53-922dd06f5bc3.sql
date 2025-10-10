-- Add amount field to documents_metadata for storing PO amounts
ALTER TABLE documents_metadata
ADD COLUMN IF NOT EXISTS amount NUMERIC;

-- Add description field to documents_metadata for storing PO descriptions
ALTER TABLE documents_metadata
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN documents_metadata.amount IS 'Purchase order or transaction amount';
COMMENT ON COLUMN documents_metadata.description IS 'Description or notes about the document';