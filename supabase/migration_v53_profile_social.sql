-- Migration v53: Profile guestbook + room partner (rumkæreste)

-- ── 1. Guestbook ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profile_guestbook (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_display_name TEXT     NOT NULL,
  author_avatar_color TEXT     DEFAULT NULL,
  content          TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profile_guestbook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guestbook_read"   ON public.profile_guestbook FOR SELECT TO authenticated USING (true);
CREATE POLICY "guestbook_insert" ON public.profile_guestbook FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "guestbook_delete" ON public.profile_guestbook FOR DELETE TO authenticated
  USING (
    auth.uid() = profile_id
    OR auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 2. Partner (rumkæreste) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profile_partners (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, recipient_id)
);

ALTER TABLE public.profile_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_read"   ON public.profile_partners FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "partners_insert" ON public.profile_partners FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "partners_update" ON public.profile_partners FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id OR auth.uid() = requester_id);
CREATE POLICY "partners_delete" ON public.profile_partners FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- ── 3. Add bio update timestamp (optional nice-to-have) ───────────────────────
-- bio column already exists on profiles from earlier migration
