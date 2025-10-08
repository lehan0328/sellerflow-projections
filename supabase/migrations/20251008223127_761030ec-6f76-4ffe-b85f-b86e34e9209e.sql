-- Add pay_minimum column to credit_cards table
ALTER TABLE public.credit_cards 
ADD COLUMN pay_minimum boolean DEFAULT false;

COMMENT ON COLUMN public.credit_cards.pay_minimum IS 'Whether to pay only the minimum payment (emergency use only - will incur interest)';