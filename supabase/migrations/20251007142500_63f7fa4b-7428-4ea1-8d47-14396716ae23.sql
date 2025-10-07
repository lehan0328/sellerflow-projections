-- Add currency column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_currency ON profiles(currency);