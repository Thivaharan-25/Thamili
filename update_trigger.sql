-- Create or Replace the function that handles new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, username, role, phone, country_preference)
  VALUES (
    new.id,
    -- CHANGE: Use the contact_email from metadata (if exists), otherwise NULL.
    -- Do NOT use new.email because that is the generated 'username@thamili.app'
    new.raw_user_meta_data->>'contact_email', 
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'username',
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'country_preference'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
