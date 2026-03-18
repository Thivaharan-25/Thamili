-- Add payment_intent_id column to orders table
-- This allows us to link an order to its Stripe transaction for refunds
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id ON public.orders(payment_intent_id);

-- COMMENT ON COLUMN public.orders.payment_intent_id IS 'The Stripe Payment Intent ID associated with this order.';
