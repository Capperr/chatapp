-- Migration v4: Chat rooms, direct messages, and group chats
-- Run this in the Supabase SQL Editor

-- ==============================
-- CHAT ROOMS
-- ==============================
create table if not exists public.chat_rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  is_default boolean default false not null,
  created_at timestamptz default now() not null
);

-- Create the default general chat room
insert into public.chat_rooms (name, description, is_default)
values ('Fælleschat', 'Den generelle chat for alle', true)
on conflict do nothing;

-- Add room_id to messages and backfill with the default room
alter table public.messages add column if not exists room_id uuid references public.chat_rooms(id) on delete cascade;
update public.messages
set room_id = (select id from public.chat_rooms where is_default = true limit 1)
where room_id is null;

-- ==============================
-- CONVERSATIONS (DMs + groups)
-- ==============================
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  type text not null default 'dm', -- 'dm' or 'group'
  name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  joined_at timestamptz default now() not null,
  primary key (conversation_id, user_id)
);

create table if not exists public.conversation_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  is_deleted boolean default false not null,
  edited_at timestamptz,
  created_at timestamptz default now() not null
);

-- ==============================
-- RLS
-- ==============================
alter table public.chat_rooms enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.conversation_messages enable row level security;

-- Chat rooms: all authenticated can read; admins can write
drop policy if exists "Authenticated can view rooms" on public.chat_rooms;
create policy "Authenticated can view rooms"
  on public.chat_rooms for select to authenticated using (true);

drop policy if exists "Admins can manage rooms" on public.chat_rooms;
create policy "Admins can manage rooms"
  on public.chat_rooms for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Messages: drop old update policy and create one that allows admins to update any message
drop policy if exists "Users can update own messages" on public.messages;
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

-- Conversations: members can see their conversations
drop policy if exists "Members can view their conversations" on public.conversations;
create policy "Members can view their conversations"
  on public.conversations for select to authenticated
  using (id in (
    select conversation_id from public.conversation_members where user_id = auth.uid()
  ));

drop policy if exists "Authenticated can create conversations" on public.conversations;
create policy "Authenticated can create conversations"
  on public.conversations for insert to authenticated
  with check (created_by = auth.uid());

-- Conversation members
drop policy if exists "Members can view conversation members" on public.conversation_members;
create policy "Members can view conversation members"
  on public.conversation_members for select to authenticated
  using (conversation_id in (
    select conversation_id from public.conversation_members where user_id = auth.uid()
  ));

drop policy if exists "Can join conversations" on public.conversation_members;
create policy "Can join conversations"
  on public.conversation_members for insert to authenticated
  with check (
    user_id = auth.uid() or
    conversation_id in (select id from public.conversations where created_by = auth.uid())
  );

-- Conversation messages
drop policy if exists "Members can view conversation messages" on public.conversation_messages;
create policy "Members can view conversation messages"
  on public.conversation_messages for select to authenticated
  using (conversation_id in (
    select conversation_id from public.conversation_members where user_id = auth.uid()
  ));

drop policy if exists "Members can send conversation messages" on public.conversation_messages;
create policy "Members can send conversation messages"
  on public.conversation_messages for insert to authenticated
  with check (
    auth.uid() = user_id and
    conversation_id in (
      select conversation_id from public.conversation_members where user_id = auth.uid()
    )
  );

drop policy if exists "Users can edit own conversation messages" on public.conversation_messages;
create policy "Users can edit own conversation messages"
  on public.conversation_messages for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==============================
-- REALTIME
-- ==============================
alter publication supabase_realtime add table public.chat_rooms;
alter publication supabase_realtime add table public.conversation_messages;
alter publication supabase_realtime add table public.conversation_members;
