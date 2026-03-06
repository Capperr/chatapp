-- v17: Room customization — theme color and floor pattern
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS theme_key TEXT NOT NULL DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS floor_pattern TEXT NOT NULL DEFAULT 'standard';
