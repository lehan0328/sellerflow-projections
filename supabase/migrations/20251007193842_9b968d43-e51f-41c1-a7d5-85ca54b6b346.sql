-- Make the assets bucket public so emails can display the logo
UPDATE storage.buckets 
SET public = true 
WHERE name = 'assets';