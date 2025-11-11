-- Add first_name column to admin_permissions table
ALTER TABLE admin_permissions ADD COLUMN IF NOT EXISTS first_name TEXT;