-- Migration v49: Bot outfit + avatar color, default clothing for new users

-- ── 1. Add outfit + color columns to bots ───────────────────────────────────
ALTER TABLE public.virtual_room_bots ADD COLUMN IF NOT EXISTS bot_outfit JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.virtual_room_bots ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT NULL;

-- ── 2. Default clothing function (looks up by name, safe if items don't exist) ─
CREATE OR REPLACE FUNCTION public.give_default_clothing(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN
    SELECT id FROM public.virtual_clothing_items
    WHERE name ILIKE '%alien hat%'
       OR name ILIKE '%alien trøje%'
       OR name ILIKE '%alien troeje%'
       OR name ILIKE '%alien shirt%'
  LOOP
    INSERT INTO public.virtual_user_wardrobe (user_id, clothing_id, equipped)
    VALUES (p_user_id, item.id, true)
    ON CONFLICT (user_id, clothing_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ── 3. Update handle_new_user trigger to give default clothing ───────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  username_val text;
  display_name_val text;
  color_val text;
  colors text[] := array['#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6','#84cc16'];
BEGIN
  username_val := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  display_name_val := coalesce(
    new.raw_user_meta_data->>'display_name',
    username_val
  );
  color_val := colors[1 + (abs(hashtext(new.id::text)) % array_length(colors, 1))];

  INSERT INTO public.profiles (id, username, display_name, avatar_color)
  VALUES (new.id, username_val, display_name_val, color_val);

  -- Give default starting clothing
  PERFORM public.give_default_clothing(new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
