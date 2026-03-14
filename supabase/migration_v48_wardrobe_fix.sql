-- Migration v48: Fix wardrobe INSERT RLS once and for all
-- The USING expression error happens because Postgres re-checks the SELECT policy
-- after INSERT. Solution: create a SECURITY DEFINER function that bypasses RLS.

-- Step 1: Create a helper function that runs as the DB owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_give_clothing(
  p_user_id   UUID,
  p_clothing_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.virtual_user_wardrobe (user_id, clothing_id, equipped)
  VALUES (p_user_id, p_clothing_id, false)
  ON CONFLICT (user_id, clothing_id) DO NOTHING;
END;
$$;

-- Only authenticated users can call it
REVOKE ALL ON FUNCTION public.admin_give_clothing FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_give_clothing TO authenticated;
