-- Migration v28: Allow participants to delete their private conversations
-- Run this in the Supabase SQL Editor.

DROP POLICY IF EXISTS "Participants can delete conversations" ON public.private_conversations;
CREATE POLICY "Participants can delete conversations"
  ON public.private_conversations FOR DELETE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);
