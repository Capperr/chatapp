-- ============================================
-- ChatApp Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  bio text default '',
  avatar_color text default '#8b5cf6',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================
-- MESSAGES TABLE (Global Chat)
-- ============================================
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(content) > 0 and char_length(content) <= 2000),
  created_at timestamptz default now() not null
);

-- Index for fast message retrieval
create index messages_created_at_idx on public.messages(created_at desc);
create index messages_user_id_idx on public.messages(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.messages enable row level security;

-- Profiles: anyone can view, only owner can edit
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Messages: authenticated users can read & write
create policy "Authenticated users can view messages"
  on public.messages for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can send messages"
  on public.messages for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can delete own messages"
  on public.messages for delete
  using (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  username_val text;
  display_name_val text;
  color_val text;
  colors text[] := array['#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6','#84cc16'];
begin
  username_val := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  display_name_val := coalesce(
    new.raw_user_meta_data->>'display_name',
    username_val
  );
  color_val := colors[1 + (abs(hashtext(new.id::text)) % array_length(colors, 1))];

  insert into public.profiles (id, username, display_name, avatar_color)
  values (new.id, username_val, display_name_val, color_val);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- UPDATE updated_at TRIGGER
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- REALTIME: Enable for messages table
-- ============================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.profiles;
