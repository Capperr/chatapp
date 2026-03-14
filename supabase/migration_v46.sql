-- Migration v46: Fix wardrobe RLS — allow admins to give clothing to other users
-- This explicitly drops the blocking policy by name and adds a permissive INSERT policy

DROP POLICY IF EXISTS "Users can manage own wardrobe" ON public.virtual_user_wardrobe;
DROP POLICY IF EXISTS "wardrobe_insert"               ON public.virtual_user_wardrobe;
DROP POLICY IF EXISTS "wardrobe_update"               ON public.virtual_user_wardrobe;
DROP POLICY IF EXISTS "wardrobe_delete"               ON public.virtual_user_wardrobe;
DROP POLICY IF EXISTS "wardrobe_select"               ON public.virtual_user_wardrobe;
DROP POLICY IF EXISTS "Anyone can read wardrobes"     ON public.virtual_user_wardrobe;

CREATE POLICY "wardrobe_select" ON public.virtual_user_wardrobe
  FOR SELECT USING (true);

CREATE POLICY "wardrobe_insert" ON public.virtual_user_wardrobe
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "wardrobe_update" ON public.virtual_user_wardrobe
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wardrobe_delete" ON public.virtual_user_wardrobe
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
