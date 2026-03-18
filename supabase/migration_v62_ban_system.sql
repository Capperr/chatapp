-- Migration v62: Full ban system — reason, duration, IP ban
-- Run this in the Supabase SQL Editor. Idempotent.

-- Add ban detail columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMPTZ; -- NULL = permanent
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_known_ip TEXT;

-- Table for banned IPs (prevents new-account circumvention)
CREATE TABLE IF NOT EXISTS public.banned_ips (
  ip TEXT PRIMARY KEY,
  reason TEXT,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  banned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage banned_ips" ON public.banned_ips;
CREATE POLICY "Admins manage banned_ips" ON public.banned_ips FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Allow anon/authenticated to read (needed for registration check)
DROP POLICY IF EXISTS "Anyone can read banned_ips" ON public.banned_ips;
CREATE POLICY "Anyone can read banned_ips" ON public.banned_ips FOR SELECT TO anon, authenticated USING (true);

-- Helper: extract client IP from request headers
CREATE OR REPLACE FUNCTION public.get_client_ip()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    current_setting('request.headers', true)::jsonb->>'x-real-ip',
    split_part(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', ',', 1),
    'unknown'
  )
$$;
GRANT EXECUTE ON FUNCTION public.get_client_ip() TO anon, authenticated;

-- Record current user's IP on login
CREATE OR REPLACE FUNCTION public.record_login_ip()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET last_known_ip = get_client_ip() WHERE id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_login_ip() TO authenticated;

-- Check if calling client's IP is banned (called during registration)
CREATE OR REPLACE FUNCTION public.check_ip_ban()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ip TEXT;
  v_ban RECORD;
BEGIN
  v_ip := get_client_ip();
  IF v_ip IS NULL OR v_ip = 'unknown' THEN
    RETURN jsonb_build_object('banned', false);
  END IF;
  SELECT * INTO v_ban FROM public.banned_ips WHERE ip = v_ip;
  IF FOUND THEN
    RETURN jsonb_build_object('banned', true, 'reason', COALESCE(v_ban.reason, 'Ingen årsag opgivet'));
  END IF;
  RETURN jsonb_build_object('banned', false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_ip_ban() TO anon, authenticated;

-- Admin RPC: ban a user (updates profile + adds IP to banned_ips)
CREATE OR REPLACE FUNCTION public.admin_ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_expires_at TIMESTAMPTZ -- NULL = permanent
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_role TEXT;
  v_ip TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role != 'admin' THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE public.profiles
    SET is_banned = true, ban_reason = p_reason, ban_expires_at = p_expires_at
    WHERE id = p_user_id;

  -- Also ban their last known IP
  SELECT last_known_ip INTO v_ip FROM public.profiles WHERE id = p_user_id;
  IF v_ip IS NOT NULL AND v_ip != 'unknown' THEN
    INSERT INTO public.banned_ips (ip, reason, banned_by)
      VALUES (v_ip, p_reason, auth.uid())
      ON CONFLICT (ip) DO UPDATE SET reason = p_reason, banned_by = auth.uid(), banned_at = NOW();
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- Admin RPC: unban a user (removes profile ban + IP ban)
CREATE OR REPLACE FUNCTION public.admin_unban_user(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_role TEXT;
  v_ip TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role != 'admin' THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT last_known_ip INTO v_ip FROM public.profiles WHERE id = p_user_id;
  UPDATE public.profiles
    SET is_banned = false, ban_reason = NULL, ban_expires_at = NULL
    WHERE id = p_user_id;

  IF v_ip IS NOT NULL AND v_ip != 'unknown' THEN
    DELETE FROM public.banned_ips WHERE ip = v_ip;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(UUID) TO authenticated;
