-- Migration v58: Room sort order for admin drag-and-drop reordering
-- Run this in the Supabase SQL Editor. Idempotent.

ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- Assign initial sort_order based on creation order for normal rooms
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.chat_rooms
  WHERE room_type != 'spaceship'
)
UPDATE public.chat_rooms r
SET sort_order = ranked.rn
FROM ranked
WHERE r.id = ranked.id;
