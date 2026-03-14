-- Migration v44: Force-reset ALL wardrobe RLS policies
-- Drops every policy on virtual_user_wardrobe and recreates from scratch

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'virtual_user_wardrobe' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.virtual_user_wardrobe', pol.policyname);
  END LOOP;
END $$;

-- SELECT: anyone can read all wardrobe entries (needed to show clothing on avatars)
CREATE POLICY "wardrobe_select" ON public.virtual_user_wardrobe
  FOR SELECT USING (true);

-- INSERT: any authenticated user can insert (admins give clothing to others)
CREATE POLICY "wardrobe_insert" ON public.virtual_user_wardrobe
  FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: users can only update their own rows (equip/unequip)
CREATE POLICY "wardrobe_update" ON public.virtual_user_wardrobe
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only delete their own rows
CREATE POLICY "wardrobe_delete" ON public.virtual_user_wardrobe
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
