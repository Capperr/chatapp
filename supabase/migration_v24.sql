-- Migration v24: Locked tiles per room
-- Run this in the Supabase SQL Editor.

-- locked_tiles stores an array of "gx,gy" strings, e.g. '["2,3","4,5"]'
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS locked_tiles jsonb NOT NULL DEFAULT '[]';
