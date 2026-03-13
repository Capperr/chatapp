-- v31: add aura_color column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aura_color TEXT;
