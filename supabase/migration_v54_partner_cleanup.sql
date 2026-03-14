-- Migration v54: Partner request cleanup + expiry

-- Function to delete pending requests older than 7 days (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.cleanup_expired_partner_requests()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.profile_partners
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_partner_requests() TO authenticated;
