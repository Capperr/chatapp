-- v18: Item rotation, wall mounting, and persistent online time

-- Item rotation + wall placement columns
ALTER TABLE public.virtual_room_items
  ADD COLUMN IF NOT EXISTS rotation    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wall_side   TEXT,
  ADD COLUMN IF NOT EXISTS wall_pos    FLOAT   NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS wall_height INTEGER NOT NULL DEFAULT 55;

-- Persistent total online tracking on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_online_seconds INTEGER NOT NULL DEFAULT 0;
