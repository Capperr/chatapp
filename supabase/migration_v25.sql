-- Migration v25: Achievements + badges + login streak tracking
-- Run this in the Supabase SQL Editor.

-- ─── Achievements catalog ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.achievements (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  description  text NOT NULL,
  badge_emoji  text NOT NULL DEFAULT '🏆',
  badge_color  text NOT NULL DEFAULT '#8b5cf6',
  reward_coins int  NOT NULL DEFAULT 0,
  reward_xp    int  NOT NULL DEFAULT 0,
  sort_order   int  NOT NULL DEFAULT 0
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Achievements are public" ON public.achievements;
CREATE POLICY "Achievements are public" ON public.achievements FOR SELECT USING (true);

-- ─── User achievements (earned) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id text        NOT NULL REFERENCES public.achievements(id),
  earned_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User achievements readable by all" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can earn achievements" ON public.user_achievements;
CREATE POLICY "User achievements readable by all" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Users can earn achievements"        ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Login streak + message count on profiles ──────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_date  date,
  ADD COLUMN IF NOT EXISTS login_streak     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS message_count    int NOT NULL DEFAULT 0;

-- ─── Seed achievements ─────────────────────────────────────────────────────
INSERT INTO public.achievements (id, name, description, badge_emoji, badge_color, reward_coins, reward_xp, sort_order) VALUES
  ('first_message',    'Første besked',      'Send din første besked',           '💬', '#3b82f6',  50,    0,  1),
  ('messages_50',      'Snakkesalig',         'Send 50 beskeder',                 '🗨️', '#6366f1', 200,   50,  2),
  ('messages_200',     'Veltalende',          'Send 200 beskeder',                '🎙️', '#8b5cf6', 500,  100,  3),
  ('messages_1000',    'Ordflom',             'Send 1000 beskeder',               '📢', '#a855f7',2000,  500,  4),
  ('level_5',          'Erfaren',             'Nå niveau 5',                      '⚡', '#f59e0b', 200,  100,  5),
  ('level_10',         'Veteran',             'Nå niveau 10',                     '💎', '#0ea5e9', 500,  500,  6),
  ('level_20',         'Legende',             'Nå niveau 20',                     '👑', '#f97316',2000, 1000,  7),
  ('login_streak_7',   '7 dages stribe',      'Log ind 7 dage i træk',            '🔥', '#ef4444', 500,  200,  8),
  ('login_streak_30',  '30 dages stribe',     'Log ind 30 dage i træk',           '🌟', '#eab308',2000,  500,  9),
  ('own_clothing_1',   'Modeparade',          'Køb dit første tøj',               '👗', '#ec4899', 100,    0, 10),
  ('solarie_1',        'Brunet',              'Opnå solarie niveau 1',            '☀️', '#f59e0b', 150,    0, 11),
  ('online_10h',       'Dedikeret',           'Tilbring 10 timer online',         '⏰', '#10b981', 300,  100, 12),
  ('online_100h',      'Hardcore',            'Tilbring 100 timer online',        '🏆', '#f97316',1000,  500, 13),
  ('collect_5_items',  'Samler',              'Saml 5 ting i dit inventar',       '🎒', '#84cc16', 200,    0, 14)
ON CONFLICT (id) DO NOTHING;
