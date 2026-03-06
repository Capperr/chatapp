-- ============================================================
-- Migration v19: Spaceships, real_name, avatar_color at signup
-- ============================================================

-- 1. Add owner_id + spaceship_design to chat_rooms
alter table public.chat_rooms
  add column if not exists owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists spaceship_design text;

-- 2. Add real_name to profiles
alter table public.profiles
  add column if not exists real_name text;

-- 3. Update handle_new_user trigger to use avatar_color from metadata if provided
create or replace function public.handle_new_user()
returns trigger as $$
declare
  username_val text;
  display_name_val text;
  color_val text;
  colors text[] := array['#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6','#84cc16','#f97316','#14b8a6'];
begin
  username_val := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  display_name_val := coalesce(
    new.raw_user_meta_data->>'display_name',
    username_val
  );
  color_val := coalesce(
    new.raw_user_meta_data->>'avatar_color',
    colors[1 + (abs(hashtext(new.id::text)) % array_length(colors, 1))]
  );

  insert into public.profiles (id, username, display_name, avatar_color)
  values (new.id, username_val, display_name_val, color_val);

  return new;
end;
$$ language plpgsql security definer;
