-- Migration v13: Add cols/rows to chat_rooms for custom room sizes
-- Safe to re-run. Run in the Supabase SQL Editor.

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS cols int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS rows int NOT NULL DEFAULT 8;
