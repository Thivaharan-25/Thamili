/**
 * Vercel Serverless Function: Create Payment Intent
 * 
 * This function creates a Stripe payment intent for processing payments
 * 
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * 
 * Usage:
 * POST /api/create-payment-intent
 * Body: { orderId, amount, currency, metadata }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, amount, currency = 'eur', metadata = {} } = request.body;

    // Validate input
    if (!orderId || !amount) {
      return response.status(400).json({
        error: 'Missing required fields: orderId, amount',
      });
    }

    // Get Stripe secret key
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return response.status(500).json({
        error: 'Stripe secret key not configured',
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        orderId,
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Return client secret
    return response.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Create payment intent error:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

