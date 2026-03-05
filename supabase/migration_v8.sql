-- Migration v8: Fix DM/group creation and notifications
-- Safe to re-run. Run this in the Supabase SQL Editor.

-- ============================================
-- STEP 1: Ensure conversation tables exist
-- (in case migration_v4 was never run)
-- ============================================
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  type text not null default 'dm',
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

alter table if exists public.conversations enable row level security;
alter table if exists public.conversation_members enable row level security;
alter table if exists public.conversation_messages enable row level security;

-- ============================================
-- STEP 2: Conversations RLS
-- ============================================
drop policy if exists "Authenticated can create conversations" on public.conversations;
create policy "Authenticated can create conversations"
  on public.conversations for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Members can view their conversations" on public.conversations;
create policy "Members can view their conversations"
  on public.conversations for select to authenticated
  using (
    created_by = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') or
    id in (select conversation_id from public.conversation_members where user_id = auth.uid())
  );

-- ============================================
-- STEP 3: Conversation members RLS
-- ============================================
drop policy if exists "Can join conversations" on public.conversation_members;
drop policy if exists "Members can view conversation members" on public.conversation_members;

create policy "Members can view conversation members"
  on public.conversation_members for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') or
    conversation_id in (
      select conversation_id from public.conversation_members cm
      where cm.user_id = auth.uid()
    )
  );

-- INSERT handled entirely via security definer RPC functions below (no RLS INSERT policy needed)
-- But keep a basic policy so direct inserts from admin tooling still work
create policy "Can join conversations"
  on public.conversation_members for insert to authenticated
  with check (
    user_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================
-- STEP 4: Conversation messages RLS
-- ============================================
drop policy if exists "Members can view conversation messages" on public.conversation_messages;
create policy "Members can view conversation messages"
  on public.conversation_messages for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') or
    conversation_id in (
      select conversation_id from public.conversation_members where user_id = auth.uid()
    )
  );

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

-- ============================================
-- STEP 5: RPC function to create a DM
-- Uses security definer to bypass RLS entirely
-- Returns the conversation_id (UUID)
-- ============================================
create or replace function public.create_dm(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  new_conv_id uuid;
begin
  -- Return existing DM if one already exists between these two users
  select cm1.conversation_id into existing_id
  from conversation_members cm1
  join conversation_members cm2 on cm1.conversation_id = cm2.conversation_id
  join conversations c on c.id = cm1.conversation_id
  where cm1.user_id = auth.uid()
    and cm2.user_id = target_user_id
    and c.type = 'dm'
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  -- Create new DM conversation
  insert into conversations (type, created_by)
  values ('dm', auth.uid())
  returning id into new_conv_id;

  -- Add both members atomically
  insert into conversation_members (conversation_id, user_id)
  values (new_conv_id, auth.uid()), (new_conv_id, target_user_id)
  on conflict do nothing;

  return new_conv_id;
end;
$$;

grant execute on function public.create_dm(uuid) to authenticated;

-- ============================================
-- STEP 6: RPC function to create a group chat
-- Uses security definer to bypass RLS entirely
-- Returns the conversation_id (UUID)
-- ============================================
create or replace function public.create_group_chat(group_name text, member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_conv_id uuid;
  uid uuid;
begin
  -- Create group conversation
  insert into conversations (type, name, created_by)
  values ('group', group_name, auth.uid())
  returning id into new_conv_id;

  -- Insert creator first
  insert into conversation_members (conversation_id, user_id)
  values (new_conv_id, auth.uid())
  on conflict do nothing;

  -- Insert each requested member
  foreach uid in array member_ids loop
    insert into conversation_members (conversation_id, user_id)
    values (new_conv_id, uid)
    on conflict do nothing;
  end loop;

  return new_conv_id;
end;
$$;

grant execute on function public.create_group_chat(text, uuid[]) to authenticated;

-- ============================================
-- STEP 7: Notifications table
-- Fix sender_id FK to reference profiles (not auth.users)
-- so Supabase can join display_name, avatar_color, username
-- ============================================
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null default 'mention',
  sender_id uuid,
  room_id uuid references public.chat_rooms(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  conversation_message_id uuid references public.conversation_messages(id) on delete cascade,
  content_preview text,
  is_read boolean default false not null,
  created_at timestamptz default now() not null
);

-- Fix the sender_id FK: drop any existing constraint and point to profiles
alter table public.notifications
  drop constraint if exists notifications_sender_id_fkey;

alter table public.notifications
  add constraint notifications_sender_id_fkey
  foreign key (sender_id) references public.profiles(id) on delete set null;

create index if not exists notifications_user_id_idx on public.notifications(user_id, is_read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
  on public.notifications for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "System can insert notifications" on public.notifications;
create policy "System can insert notifications"
  on public.notifications for insert
  with check (true);

-- ============================================
-- STEP 8: @mention triggers (recreate safely)
-- ============================================
create or replace function public.handle_message_mentions()
returns trigger as $$
begin
  insert into public.notifications (user_id, type, sender_id, room_id, message_id, content_preview)
  select distinct
    p.id,
    'mention',
    new.user_id,
    new.room_id,
    new.id,
    left(new.content, 120)
  from
    regexp_matches(new.content, '@([A-Za-z0-9_]+)', 'g') as m(match)
    join public.profiles p on lower(p.username) = lower(m.match[1])
  where
    p.id != new.user_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_mention on public.messages;
create trigger on_message_mention
  after insert on public.messages
  for each row execute procedure public.handle_message_mentions();

create or replace function public.handle_conv_message_mentions()
returns trigger as $$
begin
  insert into public.notifications (user_id, type, sender_id, conversation_id, conversation_message_id, content_preview)
  select distinct
    p.id,
    'mention',
    new.user_id,
    new.conversation_id,
    new.id,
    left(new.content, 120)
  from
    regexp_matches(new.content, '@([A-Za-z0-9_]+)', 'g') as m(match)
    join public.profiles p on lower(p.username) = lower(m.match[1])
  where
    p.id != new.user_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_conv_message_mention on public.conversation_messages;
create trigger on_conv_message_mention
  after insert on public.conversation_messages
  for each row execute procedure public.handle_conv_message_mentions();

-- ============================================
-- STEP 9: Realtime publications
-- ============================================
do $$
begin
  alter publication supabase_realtime add table public.conversation_members;
exception when sqlstate '42710' then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversation_messages;
exception when sqlstate '42710' then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_rooms;
exception when sqlstate '42710' then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when sqlstate '42710' then null;
end $$;

-- ============================================
-- STEP 10: Admin role
-- ============================================
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where lower(email) = lower('casperrehne3@gmail.com')
);
