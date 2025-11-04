-- Add flag to track if welcome animation has been shown
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS welcome_animation_shown BOOLEAN DEFAULT FALSE;