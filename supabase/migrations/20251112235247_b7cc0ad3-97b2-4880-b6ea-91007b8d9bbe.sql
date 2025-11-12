-- Drop the conflicting policy that was added
DROP POLICY IF EXISTS "Admins and staff can read all profiles" ON profiles;