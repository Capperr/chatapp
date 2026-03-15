-- Migration v60: Allow users to update their own achievement status (pending → claimed)
-- Run this in the Supabase SQL Editor. Idempotent.

DROP POLICY IF EXISTS "Users can update own achievements" ON public.user_achievements;
CREATE POLICY "Users can update own achievements"
  ON public.user_achievements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
