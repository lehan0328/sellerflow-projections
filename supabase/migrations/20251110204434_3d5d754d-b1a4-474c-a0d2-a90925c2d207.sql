-- Add INSERT policy for notification_history table
CREATE POLICY "Account members can create notification history" 
ON notification_history 
FOR INSERT 
TO authenticated
WITH CHECK (user_belongs_to_account(account_id));