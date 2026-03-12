-- Migration v27: Pending hourly confirmation flag
-- Run this in the Supabase SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS confirm_pending boolean NOT NULL DEFAULT false;
