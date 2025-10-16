import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADDON_PRICES = {
  bank_connection: 10, // $10 per bank/credit card connection
  amazon_connection: 50, // $50 per Amazon connection
  user: 15, // $15 per additional team member
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

    // Calculate price
    const unitPrice = ADDON_PRICES[addon_type as keyof typeof ADDON_PRICES];
    const totalAmount = unitPrice * quantity;

    console.log("[PURCHASE-ADDON] Price calculated", { unitPrice, totalAmount });

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

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: unitPrice * 100, // Convert to cents
            product_data: {
              name: addon_type === 'bank_connection' 
                ? 'Additional Financial Connection' 
                : addon_type === 'amazon_connection'
                ? 'Additional Amazon Connection'
                : 'Additional Team Member',
              description: `Add ${quantity} additional ${
                addon_type === 'bank_connection' 
                  ? 'bank/credit card' 
                  : addon_type === 'amazon_connection'
                  ? 'Amazon'
                  : 'team member'
              } ${quantity > 1 ? 's' : ''} to your account`,
            },
          },
          quantity: quantity,
        },
      ],
      mode: "payment",
      success_url: return_url 
        ? `${req.headers.get("origin")}${return_url}?addon_success=true&session_id={CHECKOUT_SESSION_ID}`
        : `${req.headers.get("origin")}/settings?addon_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: return_url
        ? `${req.headers.get("origin")}${return_url}?addon_canceled=true`
        : `${req.headers.get("origin")}/settings?addon_canceled=true`,
      metadata: {
        user_id: user.id,
        addon_type: addon_type,
        quantity: quantity.toString(),
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