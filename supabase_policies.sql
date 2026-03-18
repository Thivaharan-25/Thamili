-- 1. Enable Row Level Security on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Allow users to view their own profile
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- 3. Allow users to insert their own profile
-- This is necessary during registration
CREATE POLICY "Users can insert own profile" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. Allow users to update their own profile
-- This is necessary when updating details
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- OPTIONAL: If you want public profiles (e.g. for delivery partners to be visible)
-- CREATE POLICY "Public profiles are viewable by everyone" 
-- ON public.users FOR SELECT 
-- USING (true);
