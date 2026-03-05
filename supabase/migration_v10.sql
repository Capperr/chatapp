-- Migration v10: Fix notifications realtime delivery
-- Safe to re-run. Run this in the Supabase SQL Editor.

-- REPLICA IDENTITY FULL ensures Supabase Realtime can deliver all column
-- data for the notifications table, including for trigger-based inserts.
alter table public.notifications replica identity full;

-- Ensure authenticated users have proper grants (required for realtime delivery)
grant select, insert, update, delete on public.notifications to authenticated;
grant select on public.notifications to anon;

-- Re-add to publication safely (in case it was dropped or never added)
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when sqlstate '42710' then null;
end $$;

-- Also ensure messages and conversation_messages have REPLICA IDENTITY FULL
alter table public.messages replica identity full;
alter table public.conversation_messages replica identity full;

-- Verify grants on messages tables
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.conversation_messages to authenticated;
