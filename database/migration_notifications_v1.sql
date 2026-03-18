-- Migration: Setup Notifications and WhatsApp Features
-- Description: Creates tables and functions for in-app and WhatsApp notifications.

-- 1. Notifications Table (In-app)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 2. WhatsApp Notifications Log
CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Notification Preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT true,
    order_notifications BOOLEAN DEFAULT true,
    delivery_notifications BOOLEAN DEFAULT true,
    payment_notifications BOOLEAN DEFAULT true,
    general_notifications BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Send WhatsApp Notification Function (RPC)
-- This function acts as a trigger point. In a real scenario, you would set up a
-- Supabase Webhook on the `whatsapp_notifications` table to call an external service (like Twilio or a Vercel Function).
CREATE OR REPLACE FUNCTION public.send_whatsapp_notification(
    p_order_id TEXT,
    p_phone_number TEXT,
    p_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    -- Log the notification attempt
    INSERT INTO public.whatsapp_notifications (order_id, phone_number, message, status)
    VALUES (p_order_id, p_phone_number, p_message, 'pending')
    RETURNING id INTO v_notification_id;

    -- Return the ID so the client knows it was queued
    RETURN jsonb_build_object(
        'success', true,
        'notification_id', v_notification_id,
        'message', 'Notification queued successfully'
    );
END;
$$;

-- RLS Policies (Basic examples, adjust as needed)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" ON public.notification_preferences
    FOR ALL USING (auth.uid() = user_id);
