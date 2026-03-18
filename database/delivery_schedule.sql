-- ============================================
-- Thamili Mobile App - Delivery Schedule Table
-- Supabase PostgreSQL Database
-- Task 3.4: Create Delivery Schedule Table
-- ============================================

-- ============================================
-- DELIVERY SCHEDULE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_transit', 'delivered', 'cancelled', 'failed')),
  pickup_point_id UUID REFERENCES pickup_points(id) ON DELETE SET NULL,
  estimated_time TIME,
  actual_delivery_time TIMESTAMP WITH TIME ZONE,
  delivery_person_name TEXT,
  delivery_person_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_delivery_schedule_order_id ON delivery_schedule(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_schedule_delivery_date ON delivery_schedule(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_schedule_status ON delivery_schedule(status);
CREATE INDEX IF NOT EXISTS idx_delivery_schedule_pickup_point_id ON delivery_schedule(pickup_point_id);

-- Trigger for auto-updating updated_at timestamp
CREATE TRIGGER update_delivery_schedule_updated_at
  BEFORE UPDATE ON delivery_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Create is_admin function if it doesn't exist (needed for policies)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Temporarily disable RLS for this query to prevent recursion
  SET LOCAL row_security = off;
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

ALTER TABLE delivery_schedule ENABLE ROW LEVEL SECURITY;

-- Users can view delivery schedule for their own orders
CREATE POLICY "Users can view own delivery schedule"
  ON delivery_schedule FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = delivery_schedule.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Admins can view all delivery schedules
CREATE POLICY "Admins can view all delivery schedules"
  ON delivery_schedule FOR SELECT
  USING (is_admin());

-- Admins can insert delivery schedules
CREATE POLICY "Admins can insert delivery schedules"
  ON delivery_schedule FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update delivery schedules
CREATE POLICY "Admins can update delivery schedules"
  ON delivery_schedule FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete delivery schedules
CREATE POLICY "Admins can delete delivery schedules"
  ON delivery_schedule FOR DELETE
  USING (is_admin());

-- ============================================
-- END OF DELIVERY SCHEDULE TABLE
-- ============================================

