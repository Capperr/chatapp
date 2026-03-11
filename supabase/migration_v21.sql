-- Migration v21: Add custom PNG clothing items and give them to lars
-- Run this in the Supabase SQL Editor.

-- ─── Insert new PNG-based clothing items ──────────────────────────────────────
INSERT INTO public.virtual_clothing_items (name, slot, style_key, color, price)
VALUES
  ('Mørkt spidst hår',  'hair', 'hair_dark_spiky',  '#2a2a2a', 0),
  ('Taktisk jakke',     'top',  'jacket_tactical',  '#1a1a1a', 0)
ON CONFLICT (name) DO NOTHING;

-- ─── Give both items to lars ──────────────────────────────────────────────────
INSERT INTO public.virtual_user_wardrobe (user_id, clothing_id)
SELECT p.id, ci.id
FROM public.profiles p
CROSS JOIN public.virtual_clothing_items ci
WHERE lower(p.username) = 'lars'
  AND ci.name IN ('Mørkt spidst hår', 'Taktisk jakke')
ON CONFLICT (user_id, clothing_id) DO NOTHING;
