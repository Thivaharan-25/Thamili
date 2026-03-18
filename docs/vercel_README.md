# Vercel Serverless Functions

This directory contains serverless functions for the Thamili mobile app backend.

## Setup

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Link your project:
```bash
vercel link
```

4. Set environment variables:
```bash
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_WHATSAPP_FROM
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

5. Deploy:
```bash
vercel --prod
```

## Functions

### WhatsApp Notification (`/api/whatsapp-notification`)

Sends WhatsApp notifications via Twilio API.

**Request:**
```json
POST /api/whatsapp-notification
{
  "orderId": "order-id",
  "phoneNumber": "+491234567890",
  "message": "Your order has been confirmed!"
}
```

**Response:**
```json
{
  "success": true,
  "messageSid": "SM...",
  "status": "queued"
}
```

### Create Payment Intent (`/api/create-payment-intent`)

Creates a Stripe payment intent for processing payments.

**Request:**
```json
POST /api/create-payment-intent
{
  "orderId": "order-id",
  "amount": 50.00,
  "currency": "eur",
  "metadata": {}
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### Stripe Webhook (`/api/stripe-webhook`)

Handles Stripe webhook events for payment processing.

**Events Handled:**
- `payment_intent.succeeded` - Updates order payment status to "paid"
- `payment_intent.payment_failed` - Updates order payment status to "failed"
- `charge.refunded` - Updates order payment status to "refunded"

**Configuration:**
1. Create a webhook endpoint in Stripe Dashboard
2. Set the endpoint URL to: `https://your-domain.vercel.app/api/stripe-webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Yes |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender number | Yes |
| `STRIPE_SECRET_KEY` | Stripe Secret Key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Signing Secret | Yes |
| `SUPABASE_URL` | Supabase Project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Yes |

## Testing Locally

1. Install dependencies:
```bash
npm install @vercel/node stripe
```

2. Run locally:
```bash
vercel dev
```

3. Test endpoints:
```bash
curl -X POST http://localhost:3000/api/whatsapp-notification \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test","phoneNumber":"+491234567890","message":"Test"}'
```

## Deployment

Functions are automatically deployed when you push to the main branch (if connected to GitHub) or manually via:

```bash
vercel --prod
```

