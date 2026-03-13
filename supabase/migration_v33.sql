-- v33: roulette casino tables
CREATE TABLE IF NOT EXISTS roulette_rounds (
  id BIGINT NOT NULL,
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  result INTEGER NOT NULL CHECK (result >= 0 AND result <= 36),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, room_id)
);

CREATE TABLE IF NOT EXISTS roulette_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id BIGINT NOT NULL,
  room_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_color TEXT,
  bet_type TEXT NOT NULL,
  bet_value TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  payout INTEGER,
  won BOOLEAN,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roulette_bets_round ON roulette_bets(round_id, room_id);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_user ON roulette_bets(user_id);

ALTER TABLE roulette_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE roulette_bets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='roulette_rounds' AND policyname='roulette_rounds_read') THEN
    CREATE POLICY "roulette_rounds_read" ON roulette_rounds FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='roulette_rounds' AND policyname='roulette_rounds_insert') THEN
    CREATE POLICY "roulette_rounds_insert" ON roulette_rounds FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='roulette_bets' AND policyname='roulette_bets_read') THEN
    CREATE POLICY "roulette_bets_read" ON roulette_bets FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='roulette_bets' AND policyname='roulette_bets_insert') THEN
    CREATE POLICY "roulette_bets_insert" ON roulette_bets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='roulette_bets' AND policyname='roulette_bets_update') THEN
    CREATE POLICY "roulette_bets_update" ON roulette_bets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
