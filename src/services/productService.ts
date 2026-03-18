// Lazy import Supabase to avoid initialization during module load
// This prevents "property is not configurable" errors
import { Product, ProductCategory } from '../types';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/requestTimeout';
import { checkRateLimit } from '../utils/rateLimiter';

// Import Supabase lazily - only when needed
function getSupabase() {
  return require('./supabase').supabase;
}

// Helper function to convert base64 string to ArrayBuffer
// Manual implementation to avoid external dependencies
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
  let base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  
  // Use atob if available (browser/React Native), otherwise manual decode
  let binaryString: string;
  if (typeof atob !== 'undefined') {
    binaryString = atob(base64Data);
  } else {
    // Manual base64 decoding for environments without atob
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    base64Data = base64Data.replace(/[^A-Za-z0-9\+\/]/g, '');
    while (i < base64Data.length) {
      const encoded1 = chars.indexOf(base64Data.charAt(i++));
      const encoded2 = chars.indexOf(base64Data.charAt(i++));
      const encoded3 = chars.indexOf(base64Data.charAt(i++));
      const encoded4 = chars.indexOf(base64Data.charAt(i++));
      const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
      result += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
    }
    binaryString = result;
  }
  
  // Convert binary string to ArrayBuffer
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Lazy import expo-file-system for React Native file reading
let FileSystem: any = null;

const getFileSystem = async () => {
  if (!FileSystem) {
    try {
      FileSystem = await import('expo-file-system');
      console.log('[Upload] expo-file-system loaded successfully');
    } catch (error: any) {
      console.warn('[Upload] expo-file-system not available:', error?.message);
      console.warn('[Upload] Install it with: npx expo install expo-file-system');
    }
  }
  return FileSystem;
};

export interface ProductFilters {
  category?: ProductCategory;
  active?: boolean;
  search?: string;
}

export const productService = {
  /**
   * Get all products with optional filters
   * Supports request cancellation via AbortSignal
   * Note: Supabase doesn't natively support AbortSignal, but we check for cancellation
   * before and after the request to prevent processing canceled requests
   */
  async getProducts(filters?: ProductFilters, signal?: AbortSignal, loadingHooks?: any): Promise<Product[]> {
    checkRateLimit('product_read');
    // Check if already canceled before starting
    if (signal?.aborted) {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }

    try {
      if (loadingHooks?.showLoading) loadingHooks.showLoading();

      try {
        const supabase = getSupabase();
        let query = supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (filters?.category) {
          query = query.eq('category', filters.category);
        }

        if (filters?.active !== undefined) {
          query = query.eq('active', filters.active);
        }

        if (filters?.search) {
          query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        // Always exclude soft-deleted products
        query = query.eq('is_deleted', false);

        const result = await withTimeout(
          query,
          {
            timeout: DEFAULT_TIMEOUTS.MEDIUM,
            errorMessage: 'Failed to fetch products: request timed out',
          }
        ) as { data: Product[] | null; error: any };

        const { data, error } = result;

        // Check if canceled after request completes
        if (signal?.aborted) {
          const abortError = new Error('Request aborted');
          abortError.name = 'AbortError';
          throw abortError;
        }

        if (error) {
          throw error;
        }

        return data || [];
      } catch (error: any) {
        // If it was an abort, re-throw as AbortError
        if (signal?.aborted || error?.name === 'AbortError') {
          const abortError = new Error('Request aborted');
          abortError.name = 'AbortError';
          throw abortError;
        }
        console.error('Error fetching products:', error);
        throw error;
      }
    } finally {
      if (loadingHooks?.hideLoading) loadingHooks.hideLoading();
    }
  },

  /**
   * Get a single product by ID
   * Supports request cancellation via AbortSignal
   * Note: Supabase doesn't natively support AbortSignal, but we check for cancellation
   * before and after the request to prevent processing canceled requests
   */
  async getProductById(productId: string, signal?: AbortSignal, loadingHooks?: any): Promise<Product | null> {
    checkRateLimit('product_read');
    // Check if already canceled before starting
    if (signal?.aborted) {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }

    try {
      if (loadingHooks?.showLoading) loadingHooks.showLoading();

      try {
        const supabase = getSupabase();
        const result = await withTimeout(
          supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .eq('is_deleted', false)
            .single(),
          {
            timeout: DEFAULT_TIMEOUTS.MEDIUM,
            errorMessage: 'Failed to fetch product: request timed out',
          }
        ) as { data: Product | null; error: any };

        const { data, error } = result;

        // Check if canceled after request completes
        if (signal?.aborted) {
          const abortError = new Error('Request aborted');
          abortError.name = 'AbortError';
          throw abortError;
        }

        if (error) {
          throw error;
        }

        return data;
      } catch (error: any) {
        // If it was an abort, re-throw as AbortError
        if (signal?.aborted || error?.name === 'AbortError') {
          const abortError = new Error('Request aborted');
          abortError.name = 'AbortError';
          throw abortError;
        }
        console.error('Error fetching product:', error);
        throw error;
      }
    } finally {
      if (loadingHooks?.hideLoading) loadingHooks.hideLoading();
    }
  },

  /**
   * Create a new product (Admin only)
   */
  async createProduct(product: Omit<Product, 'id' | 'created_at'>, loadingHooks?: any): Promise<Product> {
    checkRateLimit('product_write');
    try {
      if (loadingHooks?.showLoading) loadingHooks.showLoading();

      return await withTimeout(
        (async () => {
          try {
            const supabase = getSupabase();
            const { data, error } = await supabase
              .from('products')
              .insert(product)
              .select()
              .single();

            if (error) {
              throw error;
            }

            return data;
          } catch (error) {
            console.error('Error creating product:', error);
            throw error;
          }
        })(),
        {
          timeout: DEFAULT_TIMEOUTS.VERY_LONG,
          errorMessage: 'Failed to create product: request timed out',
        }
      );
    } finally {
      if (loadingHooks?.hideLoading) loadingHooks.hideLoading();
    }
  },

  /**
   * Update a product (Admin only)
   */
  async updateProduct(productId: string, updates: Partial<Product>, loadingHooks?: any): Promise<Product> {
    checkRateLimit('product_write');
    try {
      if (loadingHooks?.showLoading) loadingHooks.showLoading();

      return await withTimeout(
        (async () => {
          try {
            const supabase = getSupabase();
            const { data, error } = await supabase
              .from('products')
              .update(updates)
              .eq('id', productId)
              .select()
              .single();

            if (error) {
              throw error;
            }

            return data;
          } catch (error) {
            console.error('Error updating product:', error);
            throw error;
          }
        })(),
        {
          timeout: DEFAULT_TIMEOUTS.VERY_LONG,
          errorMessage: 'Failed to update product: request timed out',
        }
      );
    } finally {
      if (loadingHooks?.hideLoading) loadingHooks.hideLoading();
    }
  },

  /**
   * Toggle product active status using RPC (Bypasses RLS issues)
   */
  async toggleProductActive(productId: string, active: boolean, loadingHooks?: any): Promise<void> {
    checkRateLimit('product_write');
    try {
      if (loadingHooks?.showLoading) loadingHooks.showLoading();

      await withTimeout(
        (async () => {
          const supabase = getSupabase();
          const { error } = await supabase.rpc('admin_toggle_product_status', {
            p_id: productId,
            p_active: active
          });

          if (error) {
            console.error('Error toggling product status via RPC:', error);
            throw error;
          }
        })(),
        {
          timeout: DEFAULT_TIMEOUTS.MEDIUM,
          errorMessage: 'Failed to toggle product status: request timed out',
        }
      );
    } finally {
      if (loadingHooks?.hideLoading) loadingHooks.hideLoading();
    }
  },

  /**
   * Toggle product active status for a specific country
   */
  async toggleRegionalProductActive(productId: string, country: 'germany' | 'denmark', active: boolean, loadingHooks?: any): Promise<void> {
    checkRateLimit('product_write');
    try {
      if (loadingHooks?.showLoading) loadingHooks.showLoading();

      const updates: any = {};
      if (country === 'germany') updates.active_germany = active;
      else updates.active_denmark = active;

      await withTimeout(
        (async () => {
          const supabase = getSupabase();
          const { error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', productId);

          if (error) {
            console.error('Error toggling regional product status:', error);
            throw error;
          }
        })(),
        {
          timeout: DEFAULT_TIMEOUTS.MEDIUM,
          errorMessage: 'Failed to toggle regional product status: request timed out',
        }
      );
    } finally {
      if (loadingHooks?.hideLoading) loadingHooks.hideLoading();
    }
  },

  /**
   * Delete a product (Admin only)
   */
  async deleteProduct(productId: string, loadingHooks?: any): Promise<void> {
    checkRateLimit('product_write');
    try {
      if (loadingHooks?.showLoading) loadingHooks.showLoading();

      try {
        const supabase = getSupabase();
        
        // 1. Try hard delete first
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);

        if (deleteError) {
          // 2. If it's a foreign key violation (23503), fallback to soft delete
          // This happens when the product is already in order_items
          if (deleteError.code === '23503') {
            console.log('[productService] Product referenced in orders, falling back to soft delete');
            const { error: softDeleteError } = await supabase
              .from('products')
              .update({ is_deleted: true, active: false })
              .eq('id', productId);

            if (softDeleteError) throw softDeleteError;
          } else {
            // Other error, throw it
            throw deleteError;
          }
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
      }
    } finally {
      if (loadingHooks?.hideLoading) loadingHooks.hideLoading();
    }
  },

  /**
   * Get product price for a specific country
   * Returns 0 if price is not set or invalid
   */
  getProductPrice(product: Product, country: 'germany' | 'denmark'): number {
    let price: number;
    
    switch (country) {
      case 'germany':
        price = product.price_germany;
        break;
      case 'denmark':
        price = product.price_denmark;
        break;
      default:
        // Default to Germany if unknown country
        price = product.price_germany;
    }

    // Validate price - return 0 if null, undefined, or NaN
    if (price === null || price === undefined || isNaN(price) || price < 0) {
      console.warn(`Product ${product.id} has invalid price for ${country}:`, price);
      return 0;
    }
    return price;
  },

  /**
   * Upload product image to Supabase Storage
   * @param imageUri - The local URI of the image to upload (file:// or content:// URI)
   * @param onProgress - Optional callback to track upload progress (0-100)
   * @param loadingHooks - Optional hooks to control global loading spinner
   */
  async uploadProductImage(
    imageUri: string,
    onProgress?: (progress: number) => void,
    loadingHooks?: any
  ): Promise<string> {
    checkRateLimit('product_write');
    try {
      if (loadingHooks?.showLoading) loadingHooks.showLoading();

      return await withTimeout(
        (async () => {
          try {
            const supabase = getSupabase();

            // Generate unique filename
            const fileExt = imageUri.split('.').pop()?.split('?')[0] || 'jpg'; // Remove query params
            const filename = `product_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${filename}`;

            console.log(`[Upload] Starting upload for: ${filePath}`);
            console.log(`[Upload] Source URI: ${imageUri}`);
            onProgress?.(10);

            // For React Native, we need to use expo-file-system to read the file properly
            // React Native doesn't support Blob/File/FormData for local file URIs (file:// or content://)
            // Recommended approach: Read as base64 using expo-file-system, then convert to ArrayBuffer
            let fileData: ArrayBuffer;
            let contentType = 'image/jpeg';
            
            try {
              // Try using expo-file-system first (recommended for React Native/Expo)
              const fileSystem = await getFileSystem();
              
              if (fileSystem && fileSystem.FileSystem?.EncodingType) {
                console.log('[Upload] Using expo-file-system to read file as base64...');
                
                // Read file as base64 string using expo-file-system
                const base64String = await fileSystem.FileSystem.readAsStringAsync(imageUri, {
                  encoding: fileSystem.FileSystem.EncodingType.Base64,
                });
                
                console.log(`[Upload] File read as base64. Length: ${base64String.length} characters`);
                onProgress?.(25);
                
                // Convert base64 to ArrayBuffer using our helper function
                fileData = base64ToArrayBuffer(base64String);
                console.log(`[Upload] File converted to ArrayBuffer. Size: ${fileData.byteLength} bytes`);
                onProgress?.(30);
              } else {
                // Fallback: Use fetch if expo-file-system is not available
                console.log('[Upload] expo-file-system not available, using fetch fallback...');
                throw new Error('expo-file-system not available');
              }
            } catch (fileSystemError: any) {
              console.warn('[Upload] FileSystem method failed, trying fetch fallback...', fileSystemError.message);
              
              try {
                // Fallback: Use fetch for local file URIs
                // Note: This may not work for all URI types (file://, content://) but worth trying
                console.log('[Upload] Attempting to read file using fetch...');
                const response = await fetch(imageUri, {
                  method: 'GET',
                });
                
                if (!response.ok) {
                  throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
                }
                
                // Convert to ArrayBuffer for React Native compatibility
                fileData = await response.arrayBuffer();
                console.log(`[Upload] File read via fetch. Size: ${fileData.byteLength} bytes`);
                onProgress?.(30);
                
                // Get content type from response headers if available
                const responseContentType = response.headers.get('content-type');
                if (responseContentType && responseContentType.includes('image/')) {
                  contentType = responseContentType;
                }
              } catch (fetchError: any) {
                console.error('[Upload] ❌ All read methods failed:', fetchError);
                console.error('[Upload] Error details:', {
                  message: fetchError.message,
                  stack: fetchError.stack,
                  uri: imageUri,
                  uriType: imageUri.substring(0, 10),
                });
                
                // Provide helpful error message
                const errorMessage = 
                  `Failed to read image file: ${fetchError.message || 'Unable to read file from URI'}. ` +
                  `Please ensure expo-file-system is installed (npx expo install expo-file-system) ` +
                  `or try selecting the image again.`;
                
                throw new Error(errorMessage);
              }
            }

            // Determine MIME type from file extension if not set
            if (contentType === 'image/jpeg' || !contentType.includes('image/')) {
              const mimeTypes: Record<string, string> = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
              };
              contentType = mimeTypes[fileExt.toLowerCase()] || 'image/jpeg';
            }

            console.log(`[Upload] Content type: ${contentType}`);
            console.log(`[Upload] File size: ${fileData instanceof ArrayBuffer ? fileData.byteLength : 'unknown'} bytes`);
            onProgress?.(40);

            // Upload to Supabase Storage
            // Supabase Storage accepts ArrayBuffer, Blob, File, or Uint8Array
            console.log(`[Upload] Uploading to Supabase Storage bucket: product-images`);
            console.log(`[Upload] File path: ${filePath}`);
            onProgress?.(50);

            const uploadResult = await supabase.storage
              .from('product-images')
              .upload(filePath, fileData, {
                contentType: contentType,
                upsert: true,
                cacheControl: '3600',
              });

            onProgress?.(80);

            if (uploadResult.error) {
              console.error('[Upload] Supabase Storage Error:', uploadResult.error);
              console.error('[Upload] Error details:', JSON.stringify(uploadResult.error, null, 2));
              
              // Provide more helpful error messages
              const errorMsg = uploadResult.error.message || '';
              if (errorMsg.includes('The resource already exists') || errorMsg.includes('duplicate')) {
                throw new Error('An image with this name already exists. Please try again.');
              } else if (errorMsg.includes('JWT') || errorMsg.includes('token') || errorMsg.includes('auth')) {
                throw new Error('Authentication error. Please log in again and try uploading the image.');
              } else if (errorMsg.includes('bucket') || errorMsg.includes('not found')) {
                throw new Error('Storage bucket "product-images" not found or not accessible. Please check your Supabase Storage configuration and ensure the bucket exists in Storage Dashboard.');
              } else if (errorMsg.includes('permission') || errorMsg.includes('denied') || errorMsg.includes('row-level security') || errorMsg.includes('violates row-level security')) {
                throw new Error('Permission denied: Row Level Security (RLS) policy violation. Please check your Supabase Storage RLS policies. Ensure you have run the migration_add_storage_rls_policies.sql script in Supabase SQL Editor to allow uploads to the "product-images" bucket.');
              } else {
                throw new Error(`Upload failed: ${errorMsg || 'Unknown error. Please check your Supabase configuration.'}`);
              }
            }

            if (!uploadResult.data) {
              throw new Error('Upload completed but no data returned from Supabase Storage.');
            }

            console.log(`[Upload] Upload successful. Path: ${uploadResult.data.path}`);
            console.log(`[Upload] Full path: ${uploadResult.data.fullPath || uploadResult.data.path}`);
            onProgress?.(90);

            // Get public URL using the uploaded path
            // Note: Supabase Storage getPublicUrl returns { data: { publicUrl: string } }
            // The path from uploadResult.data.path should be used directly
            const uploadedPath = uploadResult.data.path || uploadResult.data.fullPath || filePath;
            console.log('[Upload] Getting public URL for path:', uploadedPath);
            
            const urlResult = supabase.storage
              .from('product-images')
              .getPublicUrl(uploadedPath);

            let publicUrl = urlResult.data?.publicUrl;
            
            // Debug: Log the URL result
            console.log('[Upload] URL result structure:', {
              hasData: !!urlResult.data,
              publicUrl: publicUrl,
              fullResult: urlResult
            });
            
            if (!publicUrl) {
              console.warn('[Upload] ⚠️ Warning: Could not generate public URL from response, constructing manually...');
              // Fallback: construct public URL manually using the uploaded path
              const ENV = require('../config/env').ENV;
              const supabaseUrl = ENV?.SUPABASE_URL || 'https://zvefusfwaepnivzdidll.supabase.co';
              
              // Ensure the path is clean (no leading slash, handle fullPath vs path)
              let cleanPath = uploadedPath.replace(/^\//, '');
              // Remove bucket name from path if present
              cleanPath = cleanPath.replace(/^product-images\//, '');
              
              const fallbackUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${cleanPath}`;
              
              console.log('[Upload] Using fallback URL:', fallbackUrl);
              console.log('[Upload] Uploaded path:', uploadedPath);
              console.log('[Upload] Clean path:', cleanPath);
              onProgress?.(100);
              return fallbackUrl;
            }
            
            // Ensure the public URL is a valid HTTPS URL
            if (!publicUrl.startsWith('http')) {
              console.warn('[Upload] ⚠️ Public URL is not a valid HTTP URL:', publicUrl);
              const ENV = require('../config/env').ENV;
              const supabaseUrl = ENV?.SUPABASE_URL || 'https://zvefusfwaepnivzdidll.supabase.co';
              let cleanPath = uploadedPath.replace(/^\//, '');
              cleanPath = cleanPath.replace(/^product-images\//, '');
              publicUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${cleanPath}`;
              console.log('[Upload] Constructed public URL:', publicUrl);
            }
            
            // Verify the URL is correct format
            const expectedUrlPattern = /https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/product-images\//;
            if (!expectedUrlPattern.test(publicUrl)) {
              console.warn('[Upload] ⚠️ Public URL format may be incorrect:', publicUrl);
              console.warn('[Upload] Expected format: https://*.supabase.co/storage/v1/object/public/product-images/*');
            }

            onProgress?.(100);
            console.log('[Upload] ✅ Success! Public URL:', publicUrl);

            return publicUrl;

          } catch (error: any) {
            console.error('[Upload] Error uploading product image:', error);
            console.error('[Upload] Error type:', error?.constructor?.name);
            console.error('[Upload] Error stack:', error?.stack);
            
            // Re-throw with more context
            if (error?.message) {
              throw error;
            } else {
              throw new Error(`Failed to upload image: ${error?.toString() || 'Unknown error occurred'}`);
            }
          }
        })(),
        {
          timeout: DEFAULT_TIMEOUTS.VERY_LONG,
          errorMessage: 'Failed to upload image: request timed out after 60 seconds',
        }
      );
    } finally {
      if (loadingHooks?.hideLoading) loadingHooks.hideLoading();
    }
  },

  /**
   * Check stock levels and notify admins if low
   * Threshold: default 10 units
   */
  async checkStockAlerts(productId: string): Promise<void> {
    try {
      const supabase = getSupabase();
      
      // 1. Fetch product stock levels
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, stock_germany, stock_denmark')
        .eq('id', productId)
        .eq('is_deleted', false)
        .single();

      if (error || !product) return;

      const threshold = 10;
      const lowStockCountries: string[] = [];
      
      if (product.stock_germany < threshold) lowStockCountries.push('Germany');
      if (product.stock_denmark < threshold) lowStockCountries.push('Denmark');

      if (lowStockCountries.length > 0) {
        const { notificationService } = require('./notificationService');
        
        // Fetch all admins
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin');

        if (admins && admins.length > 0) {
          const { i18n } = require('../i18n');
          for (const admin of admins) {
            await notificationService.createNotification(
              admin.id,
              'stock_alert',
              i18n.t('admin.notifications.lowStockTitle'),
              i18n.t('admin.notifications.lowStockMessage', {
                product: product.name,
                stock: product.stock_germany < threshold ? product.stock_germany : product.stock_denmark
              }),
              { productId }
            );
          }
        }
      }
    } catch (error) {
      console.warn('[productService] Stock alert check failed:', error);
    }
  },
};
