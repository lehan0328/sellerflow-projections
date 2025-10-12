-- Enable team-based access for document storage
-- Allow account members to view files in their account's folder
CREATE POLICY "Account members can view purchase orders"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'purchase-orders' AND
  (storage.foldername(name))[1] IN (
    SELECT account_id::text
    FROM profiles
    WHERE user_id = auth.uid()
  )
);

-- Allow account members to upload files to their account's folder
CREATE POLICY "Account members can upload purchase orders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'purchase-orders' AND
  (storage.foldername(name))[1] IN (
    SELECT account_id::text
    FROM profiles
    WHERE user_id = auth.uid()
  )
);

-- Allow account members to update files in their account's folder
CREATE POLICY "Account members can update purchase orders"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'purchase-orders' AND
  (storage.foldername(name))[1] IN (
    SELECT account_id::text
    FROM profiles
    WHERE user_id = auth.uid()
  )
);

-- Allow account members to delete files in their account's folder
CREATE POLICY "Account members can delete purchase orders"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'purchase-orders' AND
  (storage.foldername(name))[1] IN (
    SELECT account_id::text
    FROM profiles
    WHERE user_id = auth.uid()
  )
);