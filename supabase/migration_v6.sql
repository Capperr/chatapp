-- Migration v6: Admin message visibility + @mention notifications
-- Run this in the Supabase SQL Editor

-- ============================================
-- ADMIN VISIBILITY: Conversations
-- ============================================
drop policy if exists "Members can view their conversations" on public.conversations;
create policy "Members can view their conversations"
  on public.conversations for select to authenticated
  using (
    created_by = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') or
    id in (select conversation_id from public.conversation_members where user_id = auth.uid())
  );

drop policy if exists "Members can view conversation members" on public.conversation_members;
create policy "Members can view conversation members"
  on public.conversation_members for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') or
    conversation_id in (
      select conversation_id from public.conversation_members where user_id = auth.uid()
    )
  );

drop policy if exists "Members can view conversation messages" on public.conversation_messages;
create policy "Members can view conversation messages"
  on public.conversation_messages for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') or
    conversation_id in (
      select conversation_id from public.conversation_members where user_id = auth.uid()
    )
  );

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null default 'mention',
  sender_id uuid references auth.users(id) on delete set null,
  room_id uuid references public.chat_rooms(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  conversation_message_id uuid references public.conversation_messages(id) on delete cascade,
  content_preview text,
  is_read boolean default false not null,
  created_at timestamptz default now() not null
);

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
-- TRIGGER: @mention notifications for room messages
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

-- ============================================
-- TRIGGER: @mention notifications for conversation messages
-- ============================================
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
-- REALTIME for notifications
-- ============================================
alter publication supabase_realtime add table public.notifications;
