-- Migration v15: Coins system, shop room type, clothing prices
-- Safe to re-run. Run in the Supabase SQL Editor.

-- ─── Profiles: coins + last_coin_award ────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS last_coin_award timestamptz NOT NULL DEFAULT '2000-01-01';

-- ─── Clothing items: price ────────────────────────────────────────────────────
ALTER TABLE public.virtual_clothing_items
  ADD COLUMN IF NOT EXISTS price integer NOT NULL DEFAULT 100;

-- ─── Chat rooms: room_type ────────────────────────────────────────────────────
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS room_type text NOT NULL DEFAULT 'normal';

-- ─── Seed clothing prices ─────────────────────────────────────────────────────
UPDATE public.virtual_clothing_items SET price = 200 WHERE slot = 'hat';
UPDATE public.virtual_clothing_items SET price = 120 WHERE slot = 'hair';
UPDATE public.virtual_clothing_items SET price = 80  WHERE slot = 'glasses';
UPDATE public.virtual_clothing_items SET price = 90  WHERE slot = 'beard';
UPDATE public.virtual_clothing_items SET price = 150 WHERE slot = 'top';
UPDATE public.virtual_clothing_items SET price = 60  WHERE slot IN ('left_hand', 'right_hand');
