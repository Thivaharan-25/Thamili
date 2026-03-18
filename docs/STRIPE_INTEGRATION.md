# Stripe Payment Integration Guide

## Overview

The Thamili app now includes full Stripe payment integration for secure online payments. This guide explains how to set up and use the Stripe payment system.

## Implementation Status

✅ **Completed:**
- Stripe React Native SDK installed
- Payment intent creation (Vercel function)
- Stripe Payment Sheet integration
- Payment success/failure handling
- Order status updates on payment

## Setup Instructions

### 1. Stripe Account Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
3. For testing, use test mode keys (starts with `pk_test_` and `sk_test_`)

### 2. Environment Variables

Add to your `.env` file in `ThamiliApp/`:

```env
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

**Note:** The secret key is only used in Vercel functions, not in the mobile app.

### 3. Vercel Function Setup

#### Deploy Payment Intent Function

1. Navigate to `ThamiliApp/vercel/` directory
2. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

3. Set environment variables in Vercel:
   ```bash
   vercel env add STRIPE_SECRET_KEY
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   ```

4. Get your Vercel deployment URL (e.g., `https://your-app.vercel.app`)

5. Add to your `.env` file:
   ```env
   EXPO_PUBLIC_VERCEL_API_URL=https://your-app.vercel.app
   ```

### 4. Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://your-app.vercel.app/api/stripe-webhook`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the webhook signing secret
6. Add to Vercel environment variables:
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET
   ```

## Payment Flow

### Customer Flow

1. **Add to Cart**: Customer adds products to cart
2. **Checkout**: Customer proceeds to checkout
3. **Select Payment Method**: Customer selects "Online Payment"
4. **Review Order**: Customer reviews order details
5. **Initialize Payment**: Customer clicks "Initialize Payment"
   - Order is created in database
   - Payment intent is created via Vercel function
   - Payment Sheet is initialized
6. **Complete Payment**: Customer clicks "Pay" button
   - Stripe Payment Sheet opens
   - Customer enters payment details
   - Payment is processed
7. **Order Confirmation**: On success, order status is updated and customer sees confirmation

### Cash on Delivery (COD) Flow

1. Customer selects "Cash on Delivery"
2. Customer reviews order
3. Customer clicks "Place Order (COD)"
4. Order is created with `payment_status: 'pending'`
5. Customer sees order confirmation
6. Admin marks order as paid after delivery

## Code Structure

### Frontend Components

- **`src/components/StripePaymentButton.tsx`**: Button component that opens Stripe Payment Sheet
- **`src/services/stripeService.ts`**: Service for creating payment intents
- **`src/screens/customer/CheckoutScreen.tsx`**: Checkout flow with Stripe integration

### Backend Functions

- **`vercel/functions/create-payment-intent.ts`**: Creates Stripe payment intent
- **`vercel/functions/stripe-webhook.ts`**: Handles Stripe webhook events

## Testing

### Test Mode

1. Use Stripe test mode keys (starts with `pk_test_` and `sk_test_`)
2. Use Stripe test cards:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **3D Secure**: `4000 0027 6000 3184`
3. Use any future expiry date (e.g., 12/34)
4. Use any 3-digit CVC

### Testing Steps

1. **Test Payment Success:**
   - Add items to cart
   - Go to checkout
   - Select "Online Payment"
   - Click "Initialize Payment"
   - Click "Pay" button
   - Use test card: `4242 4242 4242 4242`
   - Verify order status updates to "paid"

2. **Test Payment Failure:**
   - Use test card: `4000 0000 0000 0002`
   - Verify error message is shown
   - Verify order remains with "pending" status

3. **Test COD:**
   - Select "Cash on Delivery"
   - Place order
   - Verify order is created with "pending" payment status

## Troubleshooting

### Payment Sheet Not Opening

- **Issue**: Payment sheet doesn't open
- **Solution**: 
  - Check if `STRIPE_PUBLISHABLE_KEY` is set correctly
  - Verify StripeProvider is initialized in `App.tsx`
  - Check console for errors

### Payment Intent Creation Fails

- **Issue**: "Failed to create payment intent"
- **Solution**:
  - Verify Vercel function is deployed
  - Check `EXPO_PUBLIC_VERCEL_API_URL` is set correctly
  - Verify `STRIPE_SECRET_KEY` is set in Vercel environment variables
  - Check Vercel function logs

### Webhook Not Working

- **Issue**: Order status not updating after payment
- **Solution**:
  - Verify webhook endpoint is configured in Stripe Dashboard
  - Check `STRIPE_WEBHOOK_SECRET` is set in Vercel
  - Verify webhook events are selected correctly
  - Check Vercel function logs for webhook errors

### Payment Success But Order Not Updated

- **Issue**: Payment succeeds but order status doesn't update
- **Solution**:
  - Check webhook is receiving events
  - Verify `orderId` is in payment intent metadata
  - Check Supabase connection in webhook function
  - Verify RLS policies allow webhook to update orders

## Production Checklist

Before going live:

- [ ] Switch to Stripe live mode keys
- [ ] Update `STRIPE_PUBLISHABLE_KEY` to live key
- [ ] Update `STRIPE_SECRET_KEY` in Vercel to live key
- [ ] Create production webhook endpoint
- [ ] Test with real payment methods
- [ ] Set up monitoring and alerts
- [ ] Configure refund handling
- [ ] Set up dispute handling

## Security Notes

- **Never expose secret keys** in client-side code
- Secret keys are only used in Vercel functions (server-side)
- Publishable keys are safe to use in mobile app
- All payment data is handled by Stripe (PCI compliant)
- Webhook signatures are verified to prevent fraud

## Support

For Stripe-related issues:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

For app-specific issues:
- Check function logs in Vercel Dashboard
- Check Supabase logs for database errors
- Review error messages in app console

