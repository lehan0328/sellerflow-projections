-- Fix RLS policies for amazon_payouts to use user_id instead of account_id
-- Also increase transaction history depth

-- Drop existing policies
DROP POLICY IF EXISTS "Account members can view Amazon payouts" ON amazon_payouts;
DROP POLICY IF EXISTS "Account members can create Amazon payouts" ON amazon_payouts;
DROP POLICY IF EXISTS "Account members can update Amazon payouts" ON amazon_payouts;
DROP POLICY IF EXISTS "Account members can delete Amazon payouts" ON amazon_payouts;

-- Create new policies using user_id (which is what the sync function sets)
CREATE POLICY "Users can view their Amazon payouts"
  ON amazon_payouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their Amazon payouts"
  ON amazon_payouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their Amazon payouts"
  ON amazon_payouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their Amazon payouts"
  ON amazon_payouts FOR DELETE
  USING (auth.uid() = user_id);

-- Similar fix for amazon_transactions
DROP POLICY IF EXISTS "Account members can view Amazon transactions" ON amazon_transactions;
DROP POLICY IF EXISTS "Account members can create Amazon transactions" ON amazon_transactions;
DROP POLICY IF EXISTS "Account members can update Amazon transactions" ON amazon_transactions;
DROP POLICY IF EXISTS "Account members can delete Amazon transactions" ON amazon_transactions;

CREATE POLICY "Users can view their Amazon transactions"
  ON amazon_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their Amazon transactions"
  ON amazon_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their Amazon transactions"
  ON amazon_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their Amazon transactions"
  ON amazon_transactions FOR DELETE
  USING (auth.uid() = user_id);