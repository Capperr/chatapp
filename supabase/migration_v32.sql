-- v32: add bubble_color column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bubble_color TEXT;
