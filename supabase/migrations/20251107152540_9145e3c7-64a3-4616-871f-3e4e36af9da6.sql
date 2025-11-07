-- Add category column to transactions table to preserve category information
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category TEXT;