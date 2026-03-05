-- Migration v11: Virtual room items table
-- Safe to re-run. Run in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.virtual_room_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  item_type text NOT NULL DEFAULT 'flower',
  gx int,
  gy int,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.virtual_room_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read items" ON public.virtual_room_items;
DROP POLICY IF EXISTS "Authenticated can modify items" ON public.virtual_room_items;
DROP POLICY IF EXISTS "Authenticated can insert items" ON public.virtual_room_items;
DROP POLICY IF EXISTS "Authenticated can delete items" ON public.virtual_room_items;

CREATE POLICY "Anyone can read items" ON public.virtual_room_items
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can modify items" ON public.virtual_room_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can insert items" ON public.virtual_room_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete items" ON public.virtual_room_items
  FOR DELETE TO authenticated USING (true);

ALTER TABLE public.virtual_room_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.virtual_room_items;
EXCEPTION WHEN sqlstate '42710' THEN NULL;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_room_items TO authenticated;
GRANT SELECT ON public.virtual_room_items TO anon;
