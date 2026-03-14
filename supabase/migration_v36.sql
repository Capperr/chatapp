-- Migration v36: Dart mini-game tables

CREATE TABLE IF NOT EXISTS dart_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES virtual_room_items(id) ON DELETE CASCADE,
  game_type INTEGER NOT NULL CHECK (game_type IN (201, 301, 501)),
  player1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  player1_score INTEGER NOT NULL,
  player2_score INTEGER NOT NULL,
  current_player_id UUID NOT NULL REFERENCES profiles(id),
  throws_this_turn INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','finished')),
  winner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dart_throws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES dart_games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  throw_number INTEGER NOT NULL,
  segment INTEGER NOT NULL,
  multiplier INTEGER NOT NULL,
  points INTEGER NOT NULL,
  score_before INTEGER NOT NULL,
  score_after INTEGER NOT NULL,
  is_bust BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dart_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE dart_throws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dart_games_read" ON dart_games FOR SELECT TO authenticated USING (true);
CREATE POLICY "dart_games_insert" ON dart_games FOR INSERT TO authenticated WITH CHECK (auth.uid() = player1_id);
CREATE POLICY "dart_games_update" ON dart_games FOR UPDATE TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id)
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "dart_throws_read" ON dart_throws FOR SELECT TO authenticated USING (true);
CREATE POLICY "dart_throws_insert" ON dart_throws FOR INSERT TO authenticated WITH CHECK (auth.uid() = player_id);
