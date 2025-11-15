-- First, drop the old check constraint
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_payment_type_check;

-- Update legacy payment type values from 'total' to 'due-upon-order'
UPDATE vendors 
SET payment_type = 'due-upon-order' 
WHERE payment_type = 'total';

-- Add new check constraint with updated payment types
ALTER TABLE vendors ADD CONSTRAINT vendors_payment_type_check 
CHECK (payment_type IN ('due-upon-order', 'net-terms', 'preorder', 'due-upon-delivery'));