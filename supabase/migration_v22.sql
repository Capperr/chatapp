-- Migration v22: Spaceship passcode
-- Run this in the Supabase SQL Editor.

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS spaceship_passcode text;
