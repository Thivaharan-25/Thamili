import { getSupabase } from './supabase';
import { checkRateLimit } from '../utils/rateLimiter';

export interface CreatePaymentIntentParams {
  orderId: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  setupFutureUsage?: boolean;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  customer?: string;
  ephemeralKey?: string;
}

export const stripeService = {
  /**
   * Create a payment intent via Vercel function
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResponse> {
    checkRateLimit('payment');
    try {
      const supabase = getSupabase();

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: JSON.stringify({
          orderId: params.orderId,
          amount: params.amount, // Amount in major units (e.g. 10.99)
          currency: params.currency || 'eur',
          metadata: params.metadata || {},
          setupFutureUsage: params.setupFutureUsage,
        }),
      });

      console.log('📡 [stripeService] Creating Payment Intent for Order:', params.orderId, 'Amount:', params.amount);

      if (error) {
        console.error('❌ [stripeService] Edge Function Error:', JSON.stringify(error));
        throw new Error(error.message || 'Failed to create payment intent (Edge Function)');
      }

      if (!data || !data.client_secret) {
        console.error('❌ [stripeService] Invalid Response Data:', JSON.stringify(data));
        throw new Error('Invalid response from payment server');
      }

      console.log('✅ [stripeService] Payment Intent Created:', data.id);

      // Save payment_intent_id to the order in background
      this.savePaymentIntentId(params.orderId, data.id).catch(err => 
        console.warn('⚠️ [stripeService] Failed to save payment intent ID to order:', err)
      );

      return {
        clientSecret: data.client_secret,
        paymentIntentId: data.id,
        customer: data.customer,
        ephemeralKey: data.ephemeralKey,
      };
    } catch (error: any) {
      console.error('❌ [stripeService] Exception creating payment intent:', error);
      throw new Error(error.message || 'Failed to create payment intent');
    }
  },

  /**
   * Refund a payment via Vercel function
   */
  async refundPayment(orderId: string, amount: number): Promise<{ success: boolean; message?: string; error?: string }> {
    checkRateLimit('payment');
    try {
      const supabase = getSupabase();

      const { data, error } = await supabase.functions.invoke('refund-payment', {
        body: JSON.stringify({
          orderId,
          amount, // Amount in major units
        }),
      });

      if (error) {
        console.error('❌ [stripeService] Edge Function Error:', error);
        const errorDetails = typeof error === 'object' ? JSON.stringify(error) : String(error);
        throw new Error(`Refund failed (Edge Error): ${error.message || errorDetails}`);
      }

      console.log('📡 [stripeService] Refund Function Result:', JSON.stringify(data));

      if (!data) {
        throw new Error('Refund failed: No response data received from backend');
      }

      return { 
        success: !!data.success,
        message: data.message || data.error 
      };
    } catch (error: any) {
      console.error('❌ [stripeService] Refund Exception:', error);
      const msg = error.message || 'Unknown error during refund';
      throw new Error(msg);
    }
  },

  /**
   * Save Payment Intent ID to the local order record
   * @private
   */
  async savePaymentIntentId(orderId: string, paymentIntentId: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('orders')
        .update({ payment_intent_id: paymentIntentId })
        .eq('id', orderId);
      
      if (error) throw error;
      console.log(`✅ [stripeService] Linked payment intent ${paymentIntentId} to order ${orderId}`);
    } catch (error) {
      console.error('❌ [stripeService] Failed to link payment intent:', error);
      throw error;
    }
  }
};

