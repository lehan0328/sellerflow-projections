-- Add missing last_sync_error column to amazon_accounts table
ALTER TABLE public.amazon_accounts 
ADD COLUMN IF NOT EXISTS last_sync_error text;