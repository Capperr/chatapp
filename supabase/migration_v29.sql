-- Migration v29: Persist total online seconds and last hour confirm timestamp
-- Run this in the Supabase SQL Editor.

-- Ensure total_online_seconds exists (in case v18 was not run)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_online_seconds INTEGER NOT NULL DEFAULT 0;

-- Track when the user last confirmed their hourly presence bonus
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_hour_confirm_at TIMESTAMPTZ;
