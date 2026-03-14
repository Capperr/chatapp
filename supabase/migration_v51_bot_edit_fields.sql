-- Migration v51: Bot editable fields — name, message, delay, name_color, bubble_color
ALTER TABLE public.virtual_room_bots ADD COLUMN IF NOT EXISTS message_delay_ms INTEGER DEFAULT 6000;
ALTER TABLE public.virtual_room_bots ADD COLUMN IF NOT EXISTS name_color      TEXT    DEFAULT NULL;
ALTER TABLE public.virtual_room_bots ADD COLUMN IF NOT EXISTS bubble_color    TEXT    DEFAULT '#f1f5f9';
