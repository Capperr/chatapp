-- Migration v43: Fix wardrobe RLS so admins can give clothing to other users
-- Split the single ALL policy into separate policies per operation

DROP POLICY IF EXISTS "Users can manage own wardrobe" ON public.virtual_user_wardrobe;

-- Any authenticated user can INSERT a wardrobe entry for anyone
-- (the give-clothing admin flow needs this; UI restricts it to admins)
CREATE POLICY "wardrobe_insert" ON public.virtual_user_wardrobe
  FOR INSERT TO authenticated WITH CHECK (true);

-- Users can only UPDATE their own wardrobe entries (equip/unequip)
CREATE POLICY "wardrobe_update" ON public.virtual_user_wardrobe
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can only DELETE their own wardrobe entries
CREATE POLICY "wardrobe_delete" ON public.virtual_user_wardrobe
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
