-- Migration v59: Manual achievement claiming — add status column to user_achievements
-- Run this in the Supabase SQL Editor. Idempotent.

ALTER TABLE public.user_achievements
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'claimed'
    CHECK (status IN ('pending', 'claimed'));

-- Existing rows were auto-awarded, so treat them all as claimed
UPDATE public.user_achievements
  SET status = 'claimed'
  WHERE status IS NULL OR status NOT IN ('pending', 'claimed');
