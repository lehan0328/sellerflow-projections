-- Add credit_cards column to stripe_customer_audit_log table
ALTER TABLE stripe_customer_audit_log 
ADD COLUMN IF NOT EXISTS credit_cards integer DEFAULT 0;