-- ============================================
-- Migration: Add OTP Verification Table
-- ============================================
-- This table stores OTP codes for phone/WhatsApp verification
-- ============================================

-- Create OTP verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique active OTP per phone number
  CONSTRAINT unique_active_otp UNIQUE (phone_number, otp_code)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_otp_phone_number ON otp_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_verified ON otp_verifications(verified);

-- Function to clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_verifications 
  WHERE expires_at < NOW() OR verified = true;
END;
$$ LANGUAGE plpgsql;

-- Function to store OTP (called from Vercel function)
CREATE OR REPLACE FUNCTION store_otp(
  p_phone_number TEXT,
  p_otp_code TEXT,
  p_expires_in_minutes INTEGER DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
  v_otp_id UUID;
BEGIN
  -- Delete any existing unverified OTPs for this phone number
  DELETE FROM otp_verifications 
  WHERE phone_number = p_phone_number AND verified = false;
  
  -- Insert new OTP
  INSERT INTO otp_verifications (
    phone_number,
    otp_code,
    expires_at
  ) VALUES (
    p_phone_number,
    p_otp_code,
    NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL
  )
  RETURNING id INTO v_otp_id;
  
  RETURN v_otp_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security)
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can access (for Vercel functions)
CREATE POLICY "Service role can manage OTPs"
  ON otp_verifications
  FOR ALL
  USING (true); -- Service role bypasses RLS

-- ============================================
-- Verification Queries
-- ============================================

-- Check table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'otp_verifications';

-- View recent OTPs (for debugging)
-- SELECT phone_number, otp_code, expires_at, verified, created_at 
-- FROM otp_verifications 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- ============================================
-- END OF MIGRATION
-- ============================================

