-- ============================================
-- Migration v2: Admin, Mute, Edit features
-- Run this in Supabase SQL Editor
-- ============================================

-- Add admin/mute columns to profiles
alter table public.profiles
  add column if not exists role text default 'user' not null,
  add column if not exists muted_until timestamptz,
  add column if not exists is_banned boolean default false not null;

-- Add role constraint (safe to run multiple times)
do $$ begin
  alter table public.profiles
    add constraint profiles_role_check check (role in ('user', 'admin'));
exception when duplicate_object then null;
end $$;

-- Add edit/soft-delete columns to messages
alter table public.messages
  add column if not exists edited_at timestamptz,
  add column if not exists is_deleted boolean default false not null;

-- ============================================
-- UPDATE RLS POLICIES
-- ============================================

-- Allow admins to update any profile (mute, ban, promote)
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (
    auth.uid() = id OR
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Allow users to edit their own messages + admins can edit any
create policy "Users can update their own messages"
  on public.messages for update
  using (
    auth.uid() = user_id OR
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Allow admins to delete any message
drop policy if exists "Users can delete own messages" on public.messages;
create policy "Users can delete own or admin delete any"
  on public.messages for delete
  using (
    auth.uid() = user_id OR
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================
-- SET CASPER REHNE AS ADMIN
-- Run this after registering with Casperrehne1@gmail.com
-- ============================================
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email ilike 'casperrehne1@gmail.com'
);
