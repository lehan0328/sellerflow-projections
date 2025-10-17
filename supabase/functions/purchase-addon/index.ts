import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe price IDs for add-on subscriptions (monthly recurring)
const ADDON_STRIPE_PRICES = {
  bank_connection: "price_1SF2J6B28kMY3UseQW6ATKt1", // $10/month
  amazon_connection: "price_1SEHQLB28kMY3UseBmY7IIjx", // $50/month
  user: "price_1SEHQoB28kMY3UsedGTbBbmA", // $15/month
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[PURCHASE-ADDON] Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log("[PURCHASE-ADDON] User authenticated", { userId: user.id, email: user.email });

    // Get request body
    const { addon_type, quantity, return_url } = await req.json();
    
    if (!addon_type || !quantity) {
      throw new Error("Missing addon_type or quantity");
    }

    if (!['bank_connection', 'amazon_connection', 'user'].includes(addon_type)) {
      throw new Error("Invalid addon_type");
    }

    if (quantity < 1 || quantity > 10) {
      throw new Error("Quantity must be between 1 and 10");
    }

    console.log("[PURCHASE-ADDON] Processing request", { addon_type, quantity });

    // Get Stripe price ID for the add-on
    const priceId = ADDON_STRIPE_PRICES[addon_type as keyof typeof ADDON_STRIPE_PRICES];
    if (!priceId) {
      throw new Error("Invalid addon type - no price configured");
    }

    console.log("[PURCHASE-ADDON] Using Stripe price", { priceId });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[PURCHASE-ADDON] Existing customer found", { customerId });
    }

    // Create Stripe Checkout session for recurring subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      mode: "subscription",
      success_url: return_url 
        ? `${req.headers.get("origin")}${return_url}?addon_success=true&session_id={CHECKOUT_SESSION_ID}`
        : `${req.headers.get("origin")}/settings?addon_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: return_url
        ? `${req.headers.get("origin")}${return_url}?addon_canceled=true`
        : `${req.headers.get("origin")}/settings?addon_canceled=true`,
      subscription_data: {
        metadata: {
          is_addon: "true",
          addon_type: addon_type,
          user_id: user.id,
        },
      },
      metadata: {
        is_addon: "true",
        addon_type: addon_type,
        user_id: user.id,
      },
    });

    console.log("[PURCHASE-ADDON] Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[PURCHASE-ADDON] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});