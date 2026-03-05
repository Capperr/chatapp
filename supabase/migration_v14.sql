-- Migration v14: Virtual bots, clothing catalog, user wardrobe
-- Safe to re-run. Run in the Supabase SQL Editor.

-- ─── Clothing catalog ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.virtual_clothing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slot text NOT NULL,   -- hat | hair | glasses | beard | top | left_hand | right_hand
  style_key text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT virtual_clothing_items_name_key UNIQUE (name)
);
ALTER TABLE public.virtual_clothing_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read clothing"       ON public.virtual_clothing_items;
DROP POLICY IF EXISTS "Authenticated can manage clothing" ON public.virtual_clothing_items;
CREATE POLICY "Anyone can read clothing" ON public.virtual_clothing_items FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage clothing" ON public.virtual_clothing_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_clothing_items TO authenticated;
GRANT SELECT ON public.virtual_clothing_items TO anon;

-- ─── Room bots ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.virtual_room_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Bot',
  color text NOT NULL DEFAULT '#6366f1',
  gx int NOT NULL DEFAULT 0,
  gy int NOT NULL DEFAULT 0,
  message text,
  moves_randomly boolean NOT NULL DEFAULT false,
  gives_clothing_id uuid REFERENCES public.virtual_clothing_items(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.virtual_room_bots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read bots"          ON public.virtual_room_bots;
DROP POLICY IF EXISTS "Authenticated can manage bots" ON public.virtual_room_bots;
CREATE POLICY "Anyone can read bots" ON public.virtual_room_bots FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage bots" ON public.virtual_room_bots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.virtual_room_bots REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.virtual_room_bots;
EXCEPTION WHEN sqlstate '42710' THEN NULL; END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_room_bots TO authenticated;
GRANT SELECT ON public.virtual_room_bots TO anon;

-- ─── User wardrobe ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.virtual_user_wardrobe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clothing_id uuid NOT NULL REFERENCES public.virtual_clothing_items(id) ON DELETE CASCADE,
  equipped boolean NOT NULL DEFAULT false,
  obtained_at timestamptz DEFAULT now(),
  CONSTRAINT virtual_user_wardrobe_user_clothing_key UNIQUE (user_id, clothing_id)
);
ALTER TABLE public.virtual_user_wardrobe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read wardrobes"       ON public.virtual_user_wardrobe;
DROP POLICY IF EXISTS "Users can manage own wardrobe"   ON public.virtual_user_wardrobe;
CREATE POLICY "Anyone can read wardrobes" ON public.virtual_user_wardrobe FOR SELECT USING (true);
CREATE POLICY "Users can manage own wardrobe" ON public.virtual_user_wardrobe
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_user_wardrobe TO authenticated;
GRANT SELECT ON public.virtual_user_wardrobe TO anon;

-- ─── Seed clothing items ──────────────────────────────────────────────────────
INSERT INTO public.virtual_clothing_items (name, slot, style_key, color) VALUES
  ('Top hat',            'hat',        'top_hat',          '#1f2937'),
  ('Baseball kasket',    'hat',        'cap',              '#ef4444'),
  ('Krone',              'hat',        'crown',            '#f59e0b'),
  ('Cowboy hat',         'hat',        'cowboy',           '#92400e'),
  ('Langt hår',          'hair',       'hair_long',        '#92400e'),
  ('Farvet hår',         'hair',       'hair_color',       '#8b5cf6'),
  ('Runde briller',      'glasses',    'glasses_round',    '#6366f1'),
  ('Firkantede briller', 'glasses',    'glasses_square',   '#0ea5e9'),
  ('Solbriller',         'glasses',    'glasses_sun',      '#111827'),
  ('Skæg',               'beard',      'beard_full',       '#78350f'),
  ('Overskæg',           'beard',      'beard_mustache',   '#374151'),
  ('Stribet trøje',      'top',        'top_stripes',      '#3b82f6'),
  ('Rød trøje',          'top',        'top_solid',        '#ef4444'),
  ('Grøn trøje',         'top',        'top_solid',        '#22c55e')
ON CONFLICT (name) DO NOTHING;
