-- Add display_name and document_date columns to documents_metadata table
ALTER TABLE public.documents_metadata 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS document_date DATE;