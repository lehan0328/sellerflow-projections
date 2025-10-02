-- Add nickname field to credit_cards table for user customization
ALTER TABLE public.credit_cards
ADD COLUMN IF NOT EXISTS nickname text;