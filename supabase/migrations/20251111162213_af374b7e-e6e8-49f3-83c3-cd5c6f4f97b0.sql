-- Add invitation token fields to admin_permissions table
ALTER TABLE admin_permissions 
ADD COLUMN invitation_token TEXT,
ADD COLUMN token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN account_created BOOLEAN DEFAULT FALSE;