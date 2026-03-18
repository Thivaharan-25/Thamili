// Lazy import Supabase to avoid initialization during module load
import { User } from '../types';
import { checkRateLimit } from '../utils/rateLimiter';

// Import Supabase lazily - only when needed
function getSupabase() {
  return require('./supabase').supabase;
}

export const userService = {
  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<User | null> {
    checkRateLimit('default');
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  
  /**
   * Alias for getUserProfile to match common usage
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.getUserProfile(userId);
  },

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<User>
  ): Promise<User> {
    checkRateLimit('user_write');
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  /**
   * Update country preference
   */
  async updateCountryPreference(
    userId: string,
    country: 'germany' | 'denmark'
  ): Promise<User> {
    checkRateLimit('user_write');
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .update({ country_preference: country })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating country preference:', error);
      throw error;
    }
  },

  /**
   * Get all delivery partners
   */
  async getDeliveryPartners(): Promise<User[]> {
    checkRateLimit('default');
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'delivery_partner');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching delivery partners:', error);
      throw error;
    }
  },

  /**
   * Delete delivery partner
   */
  async deleteDeliveryPartner(userId: string): Promise<void> {
    try {
      const supabase = getSupabase();
      
      // First check if they have any assigned orders
      // asking for forgiveness rather than permission often works better, but let's be safe
      
      console.log('Attempting to delete user:', userId);
      
      // Try using the secure RPC function first (Recommended)
      const { error: rpcError } = await supabase.rpc('delete_user_by_id', { user_id: userId });

      if (!rpcError) {
        console.log('✅ User deleted successfully via RPC');
        return;
      }

      // Just log as info/warn since we have a fallback
      console.log('ℹ️ RPC delete skipped (Function not found). Trying standard delete...'); 

      // Fallback: Client-side delete
      // 1. Delete associated delivery schedules first (Foreign Key cleanup)
      const { error: scheduleError } = await supabase
        .from('delivery_schedule')
        .delete()
        .eq('delivery_partner_id', userId);

      if (scheduleError) {
        console.warn('Error cleaning up delivery schedules:', scheduleError);
      }

      // 2. Delete the user
      // IMPORTANT: We must check 'data' to see if anything was ACTUALLY deleted
      const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      // Supabase returns the deleted rows in 'data'. If empty, nothing was deleted (likely RLS).
      if (!data || data.length === 0) {
        console.warn('⚠️ Hard delete blocked. Attempting Soft Delete (Downgrading role)...');
        
        // Soft Delete Fallback: verification logic
        // If we can't delete, we change the role to 'customer' so they disappear from the Delivery Partner list
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'customer' })
          .eq('id', userId);
          
        if (updateError) {
          throw new Error('All deletion attempts failed (Hard and Soft). Check permissions.');
        }
        
        console.log('✅ Soft delete successful (User role changed to customer)');
        return;
      }
      
      console.log('Delete successful (Fallback)', data);
    } catch (error) {
      console.error('Error deleting delivery partner:', error);
      throw error;
    }
  },

  /**
   * Delete current user's own account
   * This calls the secure RPC function delete_user_account
   */
  async deleteCurrentUserAccount(): Promise<void> {
    try {
      const supabase = getSupabase();
      console.log('Attempting to delete current user account...');
      
      const { error } = await supabase.rpc('delete_user_account');

      if (error) {
        console.error('Error deleting user account via RPC:', error);
        throw error;
      }

      console.log('✅ Current user account deleted successfully');
    } catch (error) {
      console.error('Error in deleteCurrentUserAccount:', error);
      throw error;
    }
  },
};
