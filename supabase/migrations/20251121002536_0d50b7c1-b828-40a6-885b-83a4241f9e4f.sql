-- Allow users to view profiles of other members in their account
create policy "Users can view profiles in their account"
on profiles
for select
to authenticated
using (
  account_id in (
    select account_id 
    from profiles 
    where user_id = auth.uid()
  )
);