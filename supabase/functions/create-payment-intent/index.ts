import { serve } from "https://deno.land/std@0.224.0/http/server.ts"; // Updated to latest stable std
import Stripe from "https://esm.sh/stripe@16?target=deno&no-check"; // Latest Stripe version compatible with Deno

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2025-02-24.acacia", // Use latest stable API version (check Stripe dashboard if needed)
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Change to your frontend domain in production for security
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight (required for browser calls)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { amount, currency = "usd", metadata = {} } = body;

    // Basic validation (amount in dollars → convert to cents)
    if (typeof amount !== "number" || amount <= 0.5) {
      return new Response(
        JSON.stringify({ error: "Invalid amount (minimum 0.50)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // e.g. 10.99 → 1099 cents
      currency,
      metadata: {
        user_id: metadata.user_id || "anonymous", // Optional: add for tracking
        ...metadata,
      },
      automatic_payment_methods: { enabled: true }, // Supports cards, etc.
    });

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        id: paymentIntent.id, // Optional: for debugging
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Payment Intent Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
