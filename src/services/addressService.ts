import { Address } from '../types';
import { checkRateLimit } from '../utils/rateLimiter';

// Import Supabase lazily
function getSupabase() {
    return require('./supabase').supabase;
}

export const addressService = {
    /**
     * Get all addresses for a user
     */
    async getUserAddresses(userId: string): Promise<Address[]> {
        checkRateLimit('address');
        try {
            const supabase = getSupabase();
            console.log(`📡 [addressService] Fetching addresses for: ${userId}`);
            const { data, error } = await supabase
                .from('addresses')
                .select('*')
                .eq('user_id', userId)
                .order('is_default', { ascending: false });

            if (error) {
                console.error('❌ [addressService] Supabase error:', error);
                throw error;
            }

            console.log(`✅ [addressService] Returned ${data?.length || 0} rows`);
            return data || [];
        } catch (error) {
            console.error('Error fetching addresses:', error);
            // Return empty array instead of throwing to prevent UI crash
            return [];
        }
    },

    /**
     * Add a new address
     */
    async addAddress(address: Omit<Address, 'id' | 'created_at'>): Promise<Address | null> {
        checkRateLimit('address');
        try {
            const supabase = getSupabase();

            // If setting as default, unset other defaults first
            if (address.is_default) {
                await supabase
                    .from('addresses')
                    .update({ is_default: false })
                    .eq('user_id', address.user_id);
            }

            const { data, error } = await supabase
                .from('addresses')
                .insert([address])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error adding address:', error);
            throw error;
        }
    },

    /**
     * Update an address
     */
    async updateAddress(id: string, updates: Partial<Address>): Promise<Address | null> {
        checkRateLimit('address');
        try {
            const supabase = getSupabase();

            // If setting as default, unset other defaults first
            if (updates.is_default) {
                // We need the user_id to update others. 
                // Assuming the updates object or the caller handles this context, 
                // but typically we'd fetch the address first or require user_id.
                // For efficiency, let's assume valid RLS or we do a broad update if user_id is passed
                if (updates.user_id) {
                    await supabase
                        .from('addresses')
                        .update({ is_default: false })
                        .eq('user_id', updates.user_id)
                        .neq('id', id);
                }
            }

            const { data, error } = await supabase
                .from('addresses')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error updating address:', error);
            throw error;
        }
    },

    /**
     * Delete an address
     */
    async deleteAddress(id: string): Promise<boolean> {
        checkRateLimit('address');
        try {
            const supabase = getSupabase();
            const { error } = await supabase
                .from('addresses')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error deleting address:', error);
            throw error;
        }
    }
};
