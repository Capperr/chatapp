-- Migration v61: Per-room toggle for user item placement
-- Run this in the Supabase SQL Editor. Idempotent.

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS allow_user_items BOOLEAN DEFAULT true;
