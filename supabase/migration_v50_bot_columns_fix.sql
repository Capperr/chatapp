-- Migration v50: Ensure bot_outfit + avatar_color columns exist
-- Safe to run even if migration_v49 was already applied (uses IF NOT EXISTS)

ALTER TABLE public.virtual_room_bots ADD COLUMN IF NOT EXISTS bot_outfit  JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.virtual_room_bots ADD COLUMN IF NOT EXISTS avatar_color TEXT  DEFAULT NULL;
