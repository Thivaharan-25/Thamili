-- Migration: Add missing columns to pickup_points table
-- Date: 2026-01-14

-- Add working_hours column
ALTER TABLE pickup_points 
ADD COLUMN IF NOT EXISTS working_hours TEXT;

-- Add contact_number column
ALTER TABLE pickup_points 
ADD COLUMN IF NOT EXISTS contact_number TEXT;

-- Add admin_id column with foreign key reference
ALTER TABLE pickup_points 
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for admin_id for performance
CREATE INDEX IF NOT EXISTS idx_pickup_points_admin_id ON pickup_points(admin_id);

-- Comment on columns
COMMENT ON COLUMN pickup_points.working_hours IS 'Operating hours for the pickup point';
COMMENT ON COLUMN pickup_points.contact_number IS 'Contact phone number for the pickup point';
COMMENT ON COLUMN pickup_points.admin_id IS 'ID of the admin who created or manages this point';
