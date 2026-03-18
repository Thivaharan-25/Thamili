# Supabase Storage RLS Policies Setup Guide

## ⚠️ IMPORTANT: Permission Error
You're getting "must be owner of table objects" because regular SQL users cannot create policies on `storage.objects` directly. Use one of the methods below.

## Method 1: Using Supabase Dashboard UI (RECOMMENDED) ✅

### Step 1: Create the Bucket (if it doesn't exist)
1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Enter bucket name: `product-images`
4. Check **"Public bucket"** (for public read access)
5. Click **"Create bucket"**

### Step 2: Create RLS Policies via Dashboard

1. Go to **Supabase Dashboard** → **Storage** → **Policies** (or click on the `product-images` bucket → **Policies** tab)

2. Click **"New Policy"** for each policy below:

#### Policy 1: Allow authenticated users to upload
- **Policy name**: `Allow authenticated users to upload to product-images`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition** (USING expression):
  ```sql
  bucket_id = 'product-images'
  ```
- **WITH CHECK expression**:
  ```sql
  bucket_id = 'product-images'
  ```

#### Policy 2: Allow authenticated users to read
- **Policy name**: `Allow authenticated users to read product-images`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **Policy definition** (USING expression):
  ```sql
  bucket_id = 'product-images'
  ```

#### Policy 3: Allow public read access
- **Policy name**: `Allow public read access to product-images`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **Policy definition** (USING expression):
  ```sql
  bucket_id = 'product-images'
  ```

#### Policy 4: Allow authenticated users to update
- **Policy name**: `Allow authenticated users to update product-images`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **Policy definition** (USING expression):
  ```sql
  bucket_id = 'product-images'
  ```
- **WITH CHECK expression**:
  ```sql
  bucket_id = 'product-images'
  ```

#### Policy 5: Allow authenticated users to delete
- **Policy name**: `Allow authenticated users to delete product-images`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy definition** (USING expression):
  ```sql
  bucket_id = 'product-images'
  ```

### Alternative: Admin-Only Policies (More Secure)

If you want ONLY admins to upload/update/delete, use these policies instead:

#### Admin Upload Policy:
- **Policy name**: `Allow admins to upload to product-images`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
  ```sql
  bucket_id = 'product-images' AND 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  ```

#### Admin Update Policy:
- **Policy name**: `Allow admins to update product-images`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  bucket_id = 'product-images' AND 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  ```
- **WITH CHECK expression**:
  ```sql
  bucket_id = 'product-images' AND 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  ```

#### Admin Delete Policy:
- **Policy name**: `Allow admins to delete product-images`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  bucket_id = 'product-images' AND 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  ```

---

## Method 2: Using Supabase CLI (Alternative)

If you have Supabase CLI installed and configured:

```bash
# Navigate to your project
cd 1st-Project

# Initialize Supabase (if not already done)
npx supabase init

# Link to your Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Create the policies using SQL migration
# The policies will be applied when you run migrations
```

---

## Method 3: Using Service Role (NOT RECOMMENDED - Advanced Only)

⚠️ **Warning**: Only use this if you have access to the service role key and know what you're doing. This bypasses RLS and should be done carefully.

If you have the service role key, you can create policies through a service role connection, but this is **not recommended** for security reasons.

---

## Verification

After creating the policies, verify they're working:

1. **Check policies exist**:
   - Go to **Storage** → **Policies**
   - You should see 5 policies for `product-images` bucket

2. **Test upload**:
   - Try uploading an image in your app
   - Check the console for any errors
   - If successful, you should see the image URL in the response

3. **Test public read**:
   - The uploaded image URL should be accessible without authentication
   - Test by opening the URL in an incognito browser window

---

## Troubleshooting

### Error: "must be owner of table objects"
- **Solution**: Use Method 1 (Dashboard UI) instead of SQL Editor
- This is the recommended approach for storage policies

### Error: "bucket does not exist"
- **Solution**: Create the bucket first using Step 1 above
- Verify the bucket name is exactly `product-images`

### Error: "policy already exists"
- **Solution**: Delete existing policies first, then create new ones
- Or modify existing policies instead of creating duplicates

### Upload still fails after creating policies
- **Check**: Ensure you're logged in as an authenticated user (or admin if using admin-only policies)
- **Check**: Verify the bucket name matches exactly: `product-images`
- **Check**: Ensure RLS is enabled on the bucket (usually enabled by default)

---

## Quick Setup Checklist

- [ ] Bucket `product-images` exists in Storage Dashboard
- [ ] Bucket is set to "Public" for read access
- [ ] RLS policies created via Dashboard UI (Method 1)
- [ ] Policies include: INSERT, SELECT (public), SELECT (authenticated), UPDATE, DELETE
- [ ] Tested image upload in the app
- [ ] Upload successful, no permission errors
- [ ] Image URL accessible publicly

---

## Recommended Policy Setup (For Your App)

For the Thamili app, we recommend:

1. **Public SELECT**: Allow anyone to view product images (for displaying in the app)
2. **Authenticated INSERT**: Allow authenticated users to upload images (or admin-only for security)
3. **Authenticated UPDATE**: Allow authenticated users to update/replace images
4. **Authenticated DELETE**: Allow authenticated users to delete images

If you want stricter security, use admin-only policies for INSERT, UPDATE, and DELETE operations.

