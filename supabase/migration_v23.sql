-- Migration v23: Persist solarie minutes in DB + spaceship_passcode
-- Run this in the Supabase SQL Editor.

-- Add solarie_minutes to profiles (persists accumulated time across sessions)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS solarie_minutes float NOT NULL DEFAULT 0;

-- Also ensure spaceship_passcode exists on chat_rooms (v22 may not have run yet)
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS spaceship_passcode text;
