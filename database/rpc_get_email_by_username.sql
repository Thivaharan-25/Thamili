-- ============================================
-- RPC: Get Email by Username
-- Allows unauthenticated lookup of email addresses by username
-- for login purposes.
-- ============================================

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM users
  WHERE username = p_username
  LIMIT 1;

  RETURN v_email;
END;
$$;

COMMENT ON FUNCTION public.get_email_by_username(TEXT) IS 'Look up a user email by their username. Used by the app to support username-based login.';
