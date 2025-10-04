-- Fix bank_accounts table RLS policies to prevent financial data exposure
-- This migration ensures that users can only access their own banking information

-- Drop all existing policies on bank_accounts table to start fresh
DROP POLICY IF EXISTS "Users can view their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can create their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON public.bank_accounts;

-- Ensure RLS is enabled (this is idempotent)
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create restrictive SELECT policy - users can ONLY view their own bank accounts
CREATE POLICY "Users can view own bank accounts only"
  ON public.bank_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create INSERT policy - users can only insert their own bank accounts
CREATE POLICY "Users can insert own bank accounts only"
  ON public.bank_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create UPDATE policy - users can only update their own bank accounts
CREATE POLICY "Users can update own bank accounts only"
  ON public.bank_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create DELETE policy - users can only delete their own bank accounts
CREATE POLICY "Users can delete own bank accounts only"
  ON public.bank_accounts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.bank_accounts IS 'Sensitive financial data with strict RLS - users can only access their own bank accounts';
