-- Migration: Add dynamic delivery fee columns to pickup_points table
ALTER TABLE pickup_points 
ADD COLUMN IF NOT EXISTS base_delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS free_delivery_radius NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS extra_km_fee NUMERIC(10, 2) DEFAULT 0.00;

-- Comment on columns for clarity
COMMENT ON COLUMN pickup_points.base_delivery_fee IS 'The starting fee for home delivery from this point.';
COMMENT ON COLUMN pickup_points.free_delivery_radius IS 'Distance in KM where only the base fee applies.';
COMMENT ON COLUMN pickup_points.extra_km_fee IS 'Fee charged per extra KM outside the free radius.';
