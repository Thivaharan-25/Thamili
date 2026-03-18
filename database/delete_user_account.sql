-- Function to delete the current user's account safely
-- This function is called via RPC and runs with security definer to allow users to delete themselves
-- even if they don't have direct delete permissions on the auth schema.

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void AS $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Get the ID of the user calling the function
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Delete dependent data from public schema
    -- These tables might have foreign keys to public.users or auth.users
    -- Some might not have ON DELETE CASCADE, so we handle them manually for safety
    
    -- addresses often doesn't have cascade in some migrations
    DELETE FROM public.addresses WHERE user_id = current_user_id;
    
    -- notifications and tokens usually have cascade, but explicitly deleting 
    -- ensures the process finishes even if triggers are delayed
    DELETE FROM public.user_push_tokens WHERE user_id = current_user_id;
    DELETE FROM public.notifications WHERE user_id = current_user_id;
    DELETE FROM public.notification_preferences WHERE user_id = current_user_id;

    -- 2. Delete user from public.users
    DELETE FROM public.users WHERE id = current_user_id;

    -- 3. Delete user from auth.users
    -- This requires the function to be SECURITY DEFINER
    DELETE FROM auth.users WHERE id = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
