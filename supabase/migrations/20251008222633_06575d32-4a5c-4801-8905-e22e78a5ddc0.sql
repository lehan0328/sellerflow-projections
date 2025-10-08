-- Add forecast_next_month column to credit_cards table
ALTER TABLE public.credit_cards 
ADD COLUMN forecast_next_month boolean DEFAULT false;

COMMENT ON COLUMN public.credit_cards.forecast_next_month IS 'Whether to forecast the next month payment based on projected usage';