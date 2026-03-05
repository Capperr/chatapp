-- Migration v12: Add item_scale to virtual_room_items
-- Safe to re-run. Run in the Supabase SQL Editor.

ALTER TABLE public.virtual_room_items
  ADD COLUMN IF NOT EXISTS item_scale float NOT NULL DEFAULT 1.0;
