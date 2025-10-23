-- Drop existing RLS policies for amazon_transactions
DROP POLICY IF EXISTS "Account members can view Amazon transactions" ON amazon_transactions;
DROP POLICY IF EXISTS "Account members can create Amazon transactions" ON amazon_transactions;
DROP POLICY IF EXISTS "Account members can update Amazon transactions" ON amazon_transactions;
DROP POLICY IF EXISTS "Account members can delete Amazon transactions" ON amazon_transactions;

-- Create simpler RLS policies based on user_id
CREATE POLICY "Users can view their own Amazon transactions"
ON amazon_transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own Amazon transactions"
ON amazon_transactions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own Amazon transactions"
ON amazon_transactions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own Amazon transactions"
ON amazon_transactions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Enable realtime for amazon_transactions table
ALTER TABLE amazon_transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE amazon_transactions;