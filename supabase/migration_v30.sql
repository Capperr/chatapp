-- Migration v30: Admin name color
-- Run this in the Supabase SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name_color TEXT;
