-- Migration v52: Image support for room items
ALTER TABLE public.virtual_room_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.virtual_room_items ADD COLUMN IF NOT EXISTS img_x     INTEGER DEFAULT -30;
ALTER TABLE public.virtual_room_items ADD COLUMN IF NOT EXISTS img_y     INTEGER DEFAULT -30;
ALTER TABLE public.virtual_room_items ADD COLUMN IF NOT EXISTS img_w     INTEGER DEFAULT 60;
ALTER TABLE public.virtual_room_items ADD COLUMN IF NOT EXISTS img_h     INTEGER DEFAULT 60;
