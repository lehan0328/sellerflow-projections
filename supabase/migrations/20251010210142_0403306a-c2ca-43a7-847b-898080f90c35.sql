-- Add document_type column to documents_metadata
ALTER TABLE documents_metadata
ADD COLUMN IF NOT EXISTS document_type TEXT;

COMMENT ON COLUMN documents_metadata.document_type IS 'Type of document: invoice, purchase_order, receipt, etc.';