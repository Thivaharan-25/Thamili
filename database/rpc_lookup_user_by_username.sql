-- ============================================
-- RPC: Lookup User user by Username
-- Allows unauthenticated lookup of user existence and email by username.
-- Returns a JSON object with 'exists' (boolean) and 'email' (text or null).
-- ============================================

CREATE OR REPLACE FUNCTION public.lookup_user_by_username(p_username TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_result JSON;
BEGIN
  SELECT email, id INTO v_user_record
  FROM users
  WHERE username = p_username
  LIMIT 1;

  IF FOUND THEN
    v_result := json_build_object(
      'exists', true,
      'email', v_user_record.email
    );
  ELSE
    v_result := json_build_object(
      'exists', false,
      'email', NULL
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.lookup_user_by_username(TEXT) IS 'Look up a user existence and email by their username. Returns JSON {exists: boolean, email: string|null}.';
