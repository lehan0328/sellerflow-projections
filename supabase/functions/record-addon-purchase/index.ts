import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[RECORD-ADDON] Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    console.log("[RECORD-ADDON] User authenticated", { userId: user.id });

    // Get request body
    const { session_id } = await req.json();
    
    if (!session_id) {
      throw new Error("Missing session_id");
    }

    console.log("[RECORD-ADDON] Processing session", { session_id });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
    });

    console.log("[RECORD-ADDON] Session retrieved", { 
      status: session.payment_status,
      metadata: session.metadata 
    });

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    // Extract metadata
    const addon_type = session.metadata?.addon_type;
    const quantity = parseInt(session.metadata?.quantity || '0');
    const user_id = session.metadata?.user_id;

    if (!addon_type || !quantity || !user_id || user_id !== user.id) {
      throw new Error("Invalid session metadata");
    }

    // Get user's account_id
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    const account_id = profile?.account_id;

    // Check if this purchase has already been recorded
    const { data: existing } = await supabaseClient
      .from('purchased_addons')
      .select('id')
      .eq('stripe_payment_intent_id', (session.payment_intent as any)?.id)
      .maybeSingle();

    if (existing) {
      console.log("[RECORD-ADDON] Purchase already recorded");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Purchase already recorded" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Record the purchase
    const { data: purchase, error: insertError } = await supabaseClient
      .from('purchased_addons')
      .insert({
        user_id: user.id,
        account_id: account_id,
        addon_type: addon_type,
        quantity: quantity,
        price_paid: session.amount_total! / 100, // Convert from cents
        currency: session.currency || 'usd',
        stripe_payment_intent_id: (session.payment_intent as any)?.id,
        stripe_charge_id: (session.payment_intent as any)?.latest_charge,
        purchased_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log("[RECORD-ADDON] Purchase recorded successfully", { purchaseId: purchase.id });

    return new Response(JSON.stringify({ 
      success: true, 
      purchase: purchase 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[RECORD-ADDON] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});