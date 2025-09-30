-- Make purchase-orders bucket public so AI can access the files
UPDATE storage.buckets 
SET public = true 
WHERE id = 'purchase-orders';