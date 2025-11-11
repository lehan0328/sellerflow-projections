-- Add claimed_by field to support_tickets table to track staff assignments
ALTER TABLE support_tickets 
ADD COLUMN claimed_by UUID REFERENCES auth.users(id),
ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;