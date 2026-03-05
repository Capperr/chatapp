-- Migration v9: Fix FK references so PostgREST joins work for conversations
-- Safe to re-run. Run this in the Supabase SQL Editor.

-- ============================================
-- FIX: conversation_messages.user_id must reference public.profiles
-- (not auth.users) so that select("*, profiles(*)") works in PostgREST
-- ============================================
alter table public.conversation_messages
  drop constraint if exists conversation_messages_user_id_fkey;

alter table public.conversation_messages
  add constraint conversation_messages_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- ============================================
-- FIX: conversation_members.user_id must reference public.profiles
-- so that conversations.select("*, conversation_members(*, profiles(*))")
-- resolves correctly
-- ============================================
alter table public.conversation_members
  drop constraint if exists conversation_members_user_id_fkey;

alter table public.conversation_members
  add constraint conversation_members_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
