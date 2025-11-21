-- Drop the problematic policy that causes infinite recursion
drop policy if exists "Users can view profiles in their account" on profiles;

-- Re-create the policy using the existing security definer function to avoid recursion
create policy "Users can view profiles in their account"
on profiles
for select
to authenticated
using (
  account_id = get_user_account_id(auth.uid())
);