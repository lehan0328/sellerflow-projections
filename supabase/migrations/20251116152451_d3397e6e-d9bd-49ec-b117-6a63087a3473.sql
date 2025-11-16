-- Add max_bank_connections column to profiles table to allow admin override
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_bank_connections integer NULL;

-- Add comment to explain the column purpose
COMMENT ON COLUMN profiles.max_bank_connections IS 'Admin-set override for max bank connections. NULL means use plan default.';