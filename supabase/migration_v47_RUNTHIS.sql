-- ============================================================
-- Migration v47 — Run this ONE file to fix everything
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards)
-- ============================================================

-- ── 1. Fix virtual_user_wardrobe RLS ─────────────────────────────────────────
-- Drop ALL known policy names (safe even if they don't exist)
DROP POLICY IF EXISTS "Users can manage own wardrobe"   ON public.virtual_user_wardrobe;
DROP POLICY IF EXISTS "Anyone can read wardrobes"       ON public.virtual_user_wardrobe;
DROP POLICY IF EXISTS "wardrobe_select"                 ON public.virtual_user_wardrobe;
DROP POLICY IF EXISTS "wardrobe_insert"                 ON public.virtual_user_wardrobe;
DROP POLICY IF EXISTS "wardrobe_update"                 ON public.virtual_user_wardrobe;
DROP POLICY IF EXISTS "wardrobe_delete"                 ON public.virtual_user_wardrobe;

-- Recreate policies
CREATE POLICY "wardrobe_select" ON public.virtual_user_wardrobe
  FOR SELECT USING (true);

CREATE POLICY "wardrobe_insert" ON public.virtual_user_wardrobe
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "wardrobe_update" ON public.virtual_user_wardrobe
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wardrobe_delete" ON public.virtual_user_wardrobe
  FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- ── 2. Create notifications table from scratch (with all columns) ─────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL DEFAULT 'general',
  emoji      TEXT        NOT NULL DEFAULT '🔔',
  title      TEXT        NOT NULL DEFAULT '',
  subtitle   TEXT,
  color      TEXT        DEFAULT '#6366f1',
  read       BOOLEAN     DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns if table already existed without them
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type     TEXT    NOT NULL DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS emoji    TEXT    NOT NULL DEFAULT '🔔';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title    TEXT    NOT NULL DEFAULT '';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS color    TEXT    DEFAULT '#6366f1';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read     BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop + recreate notification policies
DROP POLICY IF EXISTS "notif_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;
DROP POLICY IF EXISTS "notif_delete" ON public.notifications;

CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime on notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN sqlstate '42710' THEN NULL; END $$;


-- ── 3. Ensure virtual_clothing_items has all image/shop columns ──────────────
ALTER TABLE public.virtual_clothing_items ADD COLUMN IF NOT EXISTS image_url      TEXT;
ALTER TABLE public.virtual_clothing_items ADD COLUMN IF NOT EXISTS img_x          INTEGER DEFAULT -31;
ALTER TABLE public.virtual_clothing_items ADD COLUMN IF NOT EXISTS img_y          INTEGER DEFAULT -36;
ALTER TABLE public.virtual_clothing_items ADD COLUMN IF NOT EXISTS img_w          INTEGER DEFAULT 62;
ALTER TABLE public.virtual_clothing_items ADD COLUMN IF NOT EXISTS img_h          INTEGER DEFAULT 77;
ALTER TABLE public.virtual_clothing_items ADD COLUMN IF NOT EXISTS level_required INTEGER DEFAULT 0;
ALTER TABLE public.virtual_clothing_items ADD COLUMN IF NOT EXISTS in_shop        BOOLEAN DEFAULT true;


-- ── 4. Storage: clothing bucket policies ─────────────────────────────────────
DROP POLICY IF EXISTS "clothing_upload" ON storage.objects;
DROP POLICY IF EXISTS "clothing_update" ON storage.objects;
DROP POLICY IF EXISTS "clothing_read"   ON storage.objects;
DROP POLICY IF EXISTS "clothing_delete" ON storage.objects;

CREATE POLICY "clothing_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'clothing');
CREATE POLICY "clothing_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'clothing');
CREATE POLICY "clothing_read"   ON storage.objects FOR SELECT TO public        USING (bucket_id = 'clothing');
CREATE POLICY "clothing_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'clothing');
