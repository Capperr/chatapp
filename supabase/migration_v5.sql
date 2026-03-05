-- Migration v5: Fix RLS policies for admin permissions
-- Run this in the Supabase SQL Editor
-- Safe to run even if previous migrations were already run

-- ============================================
-- FIX: Messages UPDATE policy
-- Drop ALL variants that may exist from v2/v4
-- ============================================
drop policy if exists "Users can update own messages" on public.messages;
drop policy if exists "Users can update their own messages" on public.messages;
drop policy if exists "Admins can update any message" on public.messages;
drop policy if exists "Users and admins can update messages" on public.messages;

create policy "Users and admins can update messages"
  on public.messages for update to authenticated
  using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================
-- FIX: Messages DELETE policy
-- Drop ALL variants
-- ============================================
drop policy if exists "Users can delete own messages" on public.messages;
drop policy if exists "Users can delete own or admin delete any" on public.messages;
drop policy if exists "Admins can delete any message" on public.messages;

create policy "Users and admins can delete messages"
  on public.messages for delete to authenticated
  using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================
-- FIX: Profiles UPDATE policy
-- Admins can update any profile (mute, ban, promote)
-- ============================================
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;

create policy "Users and admins can update profiles"
  on public.profiles for update to authenticated
  using (
    auth.uid() = id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    auth.uid() = id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================
-- FIX: Set admin role
-- Re-run safely even if already set
-- ============================================
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where lower(email) = lower('casperrehne1@gmail.com')
);

-- Confirm: run this to verify
-- select id, username, email, role from public.profiles
-- join auth.users on profiles.id = auth.users.id;
