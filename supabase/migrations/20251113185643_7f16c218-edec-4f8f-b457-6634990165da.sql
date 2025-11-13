-- Add purchase_order as a valid category type
-- First, check if the type constraint exists and modify it
DO $$ 
BEGIN
    -- Drop the existing check constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_type_check'
    ) THEN
        ALTER TABLE categories DROP CONSTRAINT categories_type_check;
    END IF;
    
    -- Add the updated constraint with purchase_order included
    ALTER TABLE categories ADD CONSTRAINT categories_type_check 
        CHECK (type IN ('expense', 'income', 'purchase_order'));
END $$;