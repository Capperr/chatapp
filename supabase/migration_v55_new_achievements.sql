-- Migration v55: New achievements — gambling, dart, social, guestbook, creative
-- Run this in the Supabase SQL Editor. All inserts are idempotent (ON CONFLICT DO NOTHING).

-- ─── New profile columns for tracking ──────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_partners_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guestbook_received_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rooms_visited_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dart_wins INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dart_games INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guestbooks_written_count INTEGER DEFAULT 0;

-- ─── New achievements ───────────────────────────────────────────────────────────
INSERT INTO public.achievements (id, name, description, badge_emoji, badge_color, reward_coins, reward_xp, sort_order) VALUES
  -- Gambling: Slots
  ('slot_first_spin', 'Enøjet bandit',      'Spil enearmet tyvknægt for første gang', '🎰', '#f59e0b', 50,  20, 30),
  ('slot_first_win',  'Begynderlykke',      'Vind på enearmet tyvknægt',              '💰', '#f59e0b', 100, 30, 31),
  -- Gambling: Roulette
  ('roulette_first_spin', 'Hjulet drejer',  'Spil roulette for første gang',          '🎡', '#8b5cf6', 50,  20, 32),
  ('roulette_first_win',  'Held og lykke',  'Vind i roulette',                        '🍀', '#10b981', 100, 30, 33),
  -- Dart
  ('dart_first_game', 'Dart-nybegynder',   'Spil dart for første gang',              '🎯', '#3b82f6', 50,  20, 40),
  ('dart_first_win',  'Pil i centrum',     'Vind dit første dart-spil',              '🏆', '#f59e0b', 150, 50, 41),
  ('dart_wins_10',    'Dart-mester',       'Vind 10 dart-spil',                      '🎖️', '#f59e0b', 500, 150, 42),
  ('dart_games_10',   'Dart-entusiast',    'Gennemfør 10 dart-spil',                 '🎳', '#3b82f6', 200, 75, 43),
  -- Social / Partner
  ('partner_first',   'Rumkærester',       'Få din første rumkæreste',               '💕', '#ec4899', 100, 30, 50),
  ('partner_10',      'Seriekæreste',      'Hav haft 10 forskellige rumkærester',    '💘', '#ec4899', 300, 100, 51),
  -- Guestbook
  ('guestbook_first', 'Første gæst',       'Modtag din første gæstebogskommentar',   '📖', '#8b5cf6', 50,  15, 60),
  ('guestbook_20',    'Populær gæstebog',  'Modtag 20 gæstebogskommentarer',         '📚', '#8b5cf6', 300, 100, 61),
  -- Creative extras
  ('coin_millionaire','Møntmillionær',     'Saml 10.000 mønter på én gang',          '🤑', '#f59e0b', 500, 200, 70),
  ('night_owl',       'Natteravn',         'Vær online 50 timer i alt',              '🦉', '#6366f1', 200, 75, 71),
  ('social_butterfly','Sommerfugl',        'Skriv i 5 forskellige brugeres gæstebøger', '🦋', '#ec4899', 150, 50, 72),
  ('wardrobe_full',   'Modeikon',          'Hav tøj i alle slots udstyret på én gang',  '👗', '#a78bfa', 200, 75, 73),
  ('room_explorer',   'Rumforsker',        'Besøg 5 forskellige rum',                '🚪', '#06b6d4', 100, 30, 74),
  ('messages_500',    'Snakkesalig',       'Send 500 beskeder',                      '💬', '#3b82f6', 300, 100, 75)
ON CONFLICT (id) DO NOTHING;

-- ─── NOTE: guestbook_received_count can be incremented via a DB trigger ────────
-- Example trigger (optional — the app also handles it client-side where possible):
-- CREATE OR REPLACE FUNCTION public.increment_guestbook_received()
-- RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   UPDATE public.profiles
--   SET guestbook_received_count = COALESCE(guestbook_received_count, 0) + 1
--   WHERE id = NEW.profile_id;
--   RETURN NEW;
-- END;
-- $$;
-- DROP TRIGGER IF EXISTS trg_guestbook_received ON public.profile_guestbook;
-- CREATE TRIGGER trg_guestbook_received
--   AFTER INSERT ON public.profile_guestbook
--   FOR EACH ROW EXECUTE FUNCTION public.increment_guestbook_received();
