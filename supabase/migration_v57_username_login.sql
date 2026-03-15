-- Migration v57: Username login support
-- Run this in the Supabase SQL Editor.

-- 1. Add email column to profiles (populated from auth.users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Populate email for all existing profiles from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. RLS: users can read their own email, nobody else's
-- (we'll use a SECURITY DEFINER function for the login lookup instead)

-- 4. Function: look up email by username (used at login)
--    SECURITY DEFINER so it can read auth.users even from the client
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT u.email INTO v_email
  FROM auth.users u
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE p.username = lower(p_username)
  LIMIT 1;
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;
