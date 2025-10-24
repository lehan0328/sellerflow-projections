-- Rename column for Amazon connection rate limiting
ALTER TABLE profiles RENAME COLUMN last_sample_data_generated TO last_amazon_connection;