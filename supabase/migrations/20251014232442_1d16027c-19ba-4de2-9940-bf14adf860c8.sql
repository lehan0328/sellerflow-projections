-- First, delete duplicate notification preferences, keeping only the most recent one for each user/type combination
DELETE FROM notification_preferences np1
USING notification_preferences np2
WHERE np1.id < np2.id
  AND np1.user_id = np2.user_id
  AND np1.notification_type = np2.notification_type
  AND np1.account_id = np2.account_id;

-- Add unique constraint to prevent future duplicates
ALTER TABLE notification_preferences
ADD CONSTRAINT notification_preferences_user_type_account_unique 
UNIQUE (user_id, notification_type, account_id);