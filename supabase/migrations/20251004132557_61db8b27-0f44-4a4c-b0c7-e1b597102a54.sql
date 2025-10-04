-- Fix profiles table RLS policies to prevent email harvesting
-- This migration ensures that users can only access their own profile data

-- First, drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Ensure RLS is enabled (this is idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create restrictive SELECT policy - users can ONLY view their own profile
CREATE POLICY "Users can view own profile only"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create INSERT policy - users can only insert their own profile
CREATE POLICY "Users can insert own profile only"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create UPDATE policy - users can only update their own profile
CREATE POLICY "Users can update own profile only"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy - profiles should not be deletable (cascade from auth.users)

-- Add comment for documentation
COMMENT ON TABLE public.profiles IS 'User profile data with strict RLS - users can only access their own profile';
