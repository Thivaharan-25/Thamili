-- Create app_config table for storing application configuration
-- This will store sensitive keys like Mapbox Secret Key

CREATE TABLE IF NOT EXISTS app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(key);

-- Enable Row Level Security
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow service role full access to app_config" ON app_config;
DROP POLICY IF EXISTS "Deny all public access to app_config" ON app_config;

-- Policy 1: Service role has full access (for server-side operations)
CREATE POLICY "Allow service role full access to app_config"
ON app_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Deny all access to authenticated and anonymous users
-- Only service role can access this table
CREATE POLICY "Deny all public access to app_config"
ON app_config
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Insert Mapbox Secret Key
-- Replace 'YOUR_MAPBOX_SECRET_KEY' with the actual secret key
INSERT INTO app_config (key, value, description)
VALUES (
    'mapbox_secret_key',
    'YOUR_MAPBOX_SECRET_KEY',
    'Mapbox Secret Key for server-side geocoding and API operations'
)
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_app_config_updated_at_trigger ON app_config;
CREATE TRIGGER update_app_config_updated_at_trigger
    BEFORE UPDATE ON app_config
    FOR EACH ROW
    EXECUTE FUNCTION update_app_config_updated_at();

-- Grant necessary permissions
GRANT ALL ON app_config TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
