-- Update support_tickets table to have 'needs_response' as default status
ALTER TABLE public.support_tickets 
ALTER COLUMN status SET DEFAULT 'needs_response';

-- Update any existing 'open' tickets to 'needs_response' to ensure consistency
UPDATE public.support_tickets 
SET status = 'needs_response' 
WHERE status = 'open';