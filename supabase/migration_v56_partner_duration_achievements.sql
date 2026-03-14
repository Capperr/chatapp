-- Migration v56: Partner duration achievements
-- Run this in the Supabase SQL Editor. Idempotent (ON CONFLICT DO NOTHING).

INSERT INTO public.achievements (id, name, description, badge_emoji, badge_color, reward_coins, reward_xp, sort_order) VALUES
  ('partner_1_week',   'Forelskede',      'Vær rumkærester i 1 uge',       '💑', '#ec4899', 100,  30, 52),
  ('partner_1_month',  'Kærlighedsmåned', 'Vær rumkærester i 1 måned',     '💝', '#ec4899', 300,  75, 53),
  ('partner_6_months', 'Halvt år sammen', 'Vær rumkærester i halvt år',    '💞', '#ec4899', 750, 150, 54),
  ('partner_1_year',   'Jubilæum',        'Vær rumkærester i 1 helt år',   '👑', '#f59e0b', 2000, 400, 55)
ON CONFLICT (id) DO NOTHING;
