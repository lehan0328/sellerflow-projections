-- Add credit limit override column to credit cards table
ALTER TABLE credit_cards
ADD COLUMN credit_limit_override numeric DEFAULT NULL;

COMMENT ON COLUMN credit_cards.credit_limit_override IS 'User-defined credit limit override for extended purchasing power beyond the standard credit limit';