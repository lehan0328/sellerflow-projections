-- Create storage bucket for purchase order documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-orders', 'purchase-orders', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for purchase-orders bucket
CREATE POLICY "Users can upload their own purchase orders"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'purchase-orders' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own purchase orders"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'purchase-orders' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own purchase orders"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'purchase-orders' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own purchase orders"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'purchase-orders' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);