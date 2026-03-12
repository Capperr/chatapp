-- Migration v26: Private messages
-- Run this in the Supabase SQL Editor.

-- ─── Conversations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.private_conversations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT different_users CHECK (user1_id <> user2_id),
  UNIQUE (user1_id, user2_id)
);

ALTER TABLE public.private_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants can read their conversations" ON public.private_conversations;
DROP POLICY IF EXISTS "Users can start conversations"            ON public.private_conversations;
CREATE POLICY "Participants can read their conversations"
  ON public.private_conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can start conversations"
  ON public.private_conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Participants can update last_message_at"
  ON public.private_conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ─── Messages ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.private_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES public.private_conversations(id) ON DELETE CASCADE,
  sender_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  delivered_at    timestamptz,
  read_at         timestamptz
);

CREATE INDEX IF NOT EXISTS private_messages_conv_idx ON public.private_messages(conversation_id, created_at);

ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants can read messages" ON public.private_messages;
DROP POLICY IF EXISTS "Sender can insert messages"    ON public.private_messages;
DROP POLICY IF EXISTS "Recipient can update receipts" ON public.private_messages;
CREATE POLICY "Participants can read messages"
  ON public.private_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.private_conversations
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );
CREATE POLICY "Sender can insert messages"
  ON public.private_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipient can update receipts"
  ON public.private_messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM public.private_conversations
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );
