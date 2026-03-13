-- v35: room portals (doors & windows)
CREATE TABLE IF NOT EXISTS room_portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  wall_side TEXT NOT NULL CHECK (wall_side IN ('left', 'right')),
  portal_type TEXT NOT NULL CHECK (portal_type IN ('door', 'window')),
  position FLOAT NOT NULL DEFAULT 0.32,
  size INTEGER NOT NULL DEFAULT 1 CHECK (size IN (1, 2, 3)),
  target_room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL
);

ALTER TABLE room_portals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='room_portals' AND policyname='portals_read') THEN
    CREATE POLICY "portals_read" ON room_portals FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='room_portals' AND policyname='portals_manage') THEN
    CREATE POLICY "portals_manage" ON room_portals FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_portals.room_id AND owner_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_portals.room_id AND owner_id = auth.uid())
      );
  END IF;
END $$;
