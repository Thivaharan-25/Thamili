-- =====================================================
-- FIX DELIVERY SCHEDULE STATUS CONSTRAINT
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Add delivery_partner_id if it's missing (needed for dashboard tracking)
ALTER TABLE public.delivery_schedule 
ADD COLUMN IF NOT EXISTS delivery_partner_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Ensure only one delivery schedule per order
-- This prevents duplicate assignments
ALTER TABLE public.delivery_schedule 
DROP CONSTRAINT IF EXISTS delivery_schedule_order_id_key;

ALTER TABLE public.delivery_schedule 
ADD CONSTRAINT delivery_schedule_order_id_key UNIQUE (order_id);

-- 3. Update the Check Constraint for status
-- This allows 'accepted' and 'picked_up' which were previously excluded
ALTER TABLE public.delivery_schedule 
DROP CONSTRAINT IF EXISTS delivery_schedule_status_check;

ALTER TABLE public.delivery_schedule 
ADD CONSTRAINT delivery_schedule_status_check 
CHECK (status IN ('scheduled', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'));

-- 4. Ensure RLS policies are correct for the new column
DROP POLICY IF EXISTS "Partners can view their schedules" ON public.delivery_schedule;
CREATE POLICY "Partners can view their schedules"
ON public.delivery_schedule FOR SELECT
TO authenticated
USING (
  delivery_partner_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Partners can update their schedules" ON public.delivery_schedule;
CREATE POLICY "Partners can update their schedules"
ON public.delivery_schedule FOR UPDATE
TO authenticated
USING (
  delivery_partner_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Update the trigger/function if necessary (Optional)
-- Just ensuring the column is searchable and indexed
CREATE INDEX IF NOT EXISTS idx_delivery_schedule_partner_id ON public.delivery_schedule(delivery_partner_id);
