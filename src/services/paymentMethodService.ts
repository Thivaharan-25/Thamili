import { SavedPaymentMethod } from '../types';

// Import Supabase lazily
function getSupabase() {
    return require('./supabase').supabase;
}

export const paymentMethodService = {
    /**
     * Get all payment methods for a user
     */
    async getUserPaymentMethods(userId: string): Promise<SavedPaymentMethod[]> {
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('payment_methods')
                .select('*')
                .eq('user_id', userId)
                .order('is_default', { ascending: false });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error fetching payment methods:', error);
            return [];
        }
    },

    /**
     * Add a new payment method (Simulated/Stored representation)
     * Note: In a real app with Stripe, you would create a SetupIntent or PaymentMethod via Stripe API
     * and then store the reference here. This service assumes we are storing the representation.
     */
    async addPaymentMethod(method: Omit<SavedPaymentMethod, 'id' | 'created_at'>): Promise<SavedPaymentMethod | null> {
        try {
            const supabase = getSupabase();

            // If setting as default, unset other defaults first
            if (method.is_default) {
                await supabase
                    .from('payment_methods')
                    .update({ is_default: false })
                    .eq('user_id', method.user_id);
            }

            const { data, error } = await supabase
                .from('payment_methods')
                .insert([method])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error adding payment method:', error);
            throw error;
        }
    },

    /**
     * Delete a payment method
     */
    async deletePaymentMethod(id: string): Promise<boolean> {
        try {
            const supabase = getSupabase();
            const { error } = await supabase
                .from('payment_methods')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error deleting payment method:', error);
            throw error;
        }
    }
};
