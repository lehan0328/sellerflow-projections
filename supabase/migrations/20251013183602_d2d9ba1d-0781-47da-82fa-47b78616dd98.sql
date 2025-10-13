-- Add customer_last_viewed_at field to support_tickets
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS customer_last_viewed_at TIMESTAMP WITH TIME ZONE;