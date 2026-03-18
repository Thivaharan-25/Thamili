-- ============================================
-- Thamili Mobile App - Storage RLS Policies
-- Supabase Storage - product-images bucket
-- ============================================
-- ⚠️ IMPORTANT: This SQL script cannot be run directly in Supabase SQL Editor
-- because regular users don't have permission to create policies on storage.objects.
-- 
-- USE ONE OF THESE METHODS INSTEAD:
-- 
-- Method 1 (RECOMMENDED): Use Supabase Dashboard UI
--   1. Go to Storage > Policies
--   2. Create policies manually using the Dashboard
--   3. See: migration_add_storage_rls_policies_DASHBOARD.md for detailed instructions
--
-- Method 2: Use Supabase CLI (if you have it set up)
--   See: migration_add_storage_rls_policies_DASHBOARD.md for CLI instructions
--
-- This SQL script is for reference only - use it as a guide when creating
-- policies via the Dashboard UI.
-- ============================================

-- ============================================
-- ⚠️ PERMISSION ERROR FIX:
-- ============================================
-- If you're getting "must be owner of table objects" error,
-- DO NOT run this SQL script directly. Instead:
-- 
-- 1. Open: migration_add_storage_rls_policies_DASHBOARD.md
-- 2. Follow the step-by-step Dashboard UI instructions
-- 3. Create policies one by one using the Supabase Dashboard
-- ============================================

-- ============================================
-- IMPORTANT: Ensure the bucket exists first!
-- ============================================
-- The bucket "product-images" must exist in Supabase Storage.
-- If it doesn't exist, create it in the Supabase Dashboard:
-- Storage > New bucket > Name: "product-images" > Public: Yes
-- ============================================

-- Note: Storage policies are created on the `storage.objects` table
-- We need to reference the bucket name in the policy conditions

-- ============================================
-- WARNING: This section requires superuser/owner privileges
-- Regular SQL users cannot execute these commands
-- ============================================
-- The following commands will fail with "must be owner of table objects"
-- Use the Dashboard UI method instead (see DASHBOARD.md file)
-- ============================================

-- ============================================
-- 2. DROP EXISTING POLICIES (if any) for product-images bucket
-- ============================================
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to upload to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins full access to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete product-images" ON storage.objects;

-- ============================================
-- 3. POLICY: Allow authenticated users to INSERT (upload) files
-- ============================================
-- Any authenticated user can upload files to the product-images bucket
-- Note: For admin-only uploads, comment this out and use the admin-only policy below instead
CREATE POLICY "Allow authenticated users to upload to product-images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
  );

-- ============================================
-- 4. POLICY: Allow authenticated users to SELECT (read) files
-- ============================================
-- Any authenticated user can read files from the product-images bucket
CREATE POLICY "Allow authenticated users to read product-images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images');

-- ============================================
-- 5. POLICY: Allow public (unauthenticated) to SELECT (read) files
-- ============================================
-- Public access for reading images (for displaying in the app)
-- This allows images to be displayed without authentication
CREATE POLICY "Allow public read access to product-images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- ============================================
-- 6. POLICY: Allow authenticated users to UPDATE files
-- ============================================
-- Authenticated users can update (replace) files they uploaded
CREATE POLICY "Allow authenticated users to update product-images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

-- ============================================
-- 7. POLICY: Allow authenticated users to DELETE files
-- ============================================
-- Authenticated users can delete files from the product-images bucket
CREATE POLICY "Allow authenticated users to delete product-images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');

-- ============================================
-- 8. ALTERNATIVE: Restrict to admins only (more secure - RECOMMENDED)
-- ============================================
-- If you want ONLY admins to upload/update/delete (more secure),
-- comment out policies 3, 6, 7 above and use these instead:

-- IMPORTANT: Uncomment the following DROP statements and admin policies
-- if you want to restrict upload/update/delete to admins only:

/*
-- Drop the broader policies first (if using admin-only approach)
DROP POLICY IF EXISTS "Allow authenticated users to upload to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete product-images" ON storage.objects;

-- Admin-only upload policy (uses is_admin() function from rls_policies.sql)
CREATE POLICY "Allow admins to upload to product-images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    is_admin()
  );

-- Admin-only update policy
CREATE POLICY "Allow admins to update product-images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    is_admin()
  )
  WITH CHECK (
    bucket_id = 'product-images' AND
    is_admin()
  );

-- Admin-only delete policy
CREATE POLICY "Allow admins to delete product-images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    is_admin()
  );
*/

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script, verify the policies were created:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Test query to check if policies are working:
-- SELECT bucket_id, name, owner FROM storage.objects WHERE bucket_id = 'product-images' LIMIT 5;

-- ============================================
-- NOTES
-- ============================================
-- 1. The bucket "product-images" must exist in Supabase Storage
-- 2. If using admin-only policies, ensure you're logged in as an admin
-- 3. Public read access allows images to be displayed without authentication
-- 4. For more security, restrict upload/update/delete to admins only (use alternative policies above)
-- ============================================

