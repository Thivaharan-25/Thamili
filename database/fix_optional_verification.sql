-- ============================================
-- Conditional Email Auto-Confirmation Trigger
-- ============================================
-- This trigger automatically confirms any user registered with a
-- dummy '@thamili.app' domain, allowing them to skip verification.
-- Real Gmail users will still receive and require verification.

-- 1. Create the auto-confirm function
CREATE OR REPLACE FUNCTION public.auto_confirm_dummy_email()
RETURNS TRIGGER AS $$
BEGIN
  -- If the email ends with our internal dummy domain
  IF NEW.email LIKE '%@thamili.app' THEN
    -- Mark as confirmed immediately
    NEW.email_confirmed_at = NOW();
    NEW.confirmed_at = NOW(); -- For compatibility with different Supabase versions
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on auth.users
-- We use BEFORE INSERT so we can modify the NEW data before it hits the table
DROP TRIGGER IF EXISTS trigger_auto_confirm_dummy_email ON auth.users;
CREATE TRIGGER trigger_auto_confirm_dummy_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_dummy_email();

COMMENT ON FUNCTION public.auto_confirm_dummy_email() IS 'Auto-confirms dummy accounts using @thamili.app domain to allow optional Gmail registration';
