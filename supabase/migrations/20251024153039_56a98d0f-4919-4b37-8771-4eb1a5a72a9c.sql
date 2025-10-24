-- Add last_sample_data_generated to profiles for rate limiting
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_sample_data_generated timestamp with time zone;