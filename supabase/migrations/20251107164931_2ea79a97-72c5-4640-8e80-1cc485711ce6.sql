-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS public.purchase_order_line_items CASCADE;

-- Create purchase_order_line_items table with proper structure
CREATE TABLE public.purchase_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID,
  document_id UUID REFERENCES public.documents_metadata(id) ON DELETE CASCADE,
  vendor_id UUID,
  sku TEXT,
  product_name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.purchase_order_line_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own line items"
  ON public.purchase_order_line_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own line items"
  ON public.purchase_order_line_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own line items"
  ON public.purchase_order_line_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own line items"
  ON public.purchase_order_line_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_line_items_document_id ON public.purchase_order_line_items(document_id);
CREATE INDEX idx_line_items_user_id ON public.purchase_order_line_items(user_id);
CREATE INDEX idx_line_items_vendor_id ON public.purchase_order_line_items(vendor_id);

-- Create function to clear all document storage for authenticated user
CREATE OR REPLACE FUNCTION public.clear_user_documents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_file_record RECORD;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get user's account_id
  SELECT account_id INTO v_account_id
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'User account not found';
  END IF;
  
  -- Delete all files from storage bucket for this account
  FOR v_file_record IN 
    SELECT file_path 
    FROM documents_metadata 
    WHERE account_id = v_account_id
  LOOP
    PERFORM storage.delete_object('purchase-orders', v_file_record.file_path);
  END LOOP;
  
  -- Delete all metadata records (this will cascade to line items automatically)
  DELETE FROM documents_metadata WHERE account_id = v_account_id;
END;
$$;