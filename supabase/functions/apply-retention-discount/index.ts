import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  // Logging disabled
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Find the customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Find active or trialing subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });
    
    const activeSubscription = subscriptions.data.find(
      sub => sub.status === "active" || sub.status === "trialing"
    );
    
    if (!activeSubscription) {
      throw new Error("No active or trialing subscription found");
    }
    
    // Check if discount already exists
    if (activeSubscription.discount) {
      logStep("Discount already applied", { 
        subscriptionId: activeSubscription.id,
        existingDiscount: activeSubscription.discount.coupon.id
      });
      return new Response(JSON.stringify({ 
        error: "A discount has already been applied to this subscription"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    logStep("Found active subscription", { 
      subscriptionId: activeSubscription.id,
      status: activeSubscription.status 
    });

    // Create or retrieve a 10% off coupon for 3 months
    let couponId = "RETENTION_10_3MONTHS";
    try {
      await stripe.coupons.retrieve(couponId);
      logStep("Using existing retention coupon");
    } catch (error) {
      // Coupon doesn't exist, create it
      await stripe.coupons.create({
        id: couponId,
        percent_off: 10,
        duration: "repeating",
        duration_in_months: 3,
        name: "Retention 10% off 3 months",
      });
      logStep("Created new retention coupon");
    }

    // Apply the coupon to the subscription
    const updatedSubscription = await stripe.subscriptions.update(activeSubscription.id, {
      discounts: [{ coupon: couponId }],
    });
    logStep("Applied discount to subscription", { 
      subscriptionId: updatedSubscription.id,
      discount: updatedSubscription.discount 
    });

    // Mark in profiles that user has redeemed the discount
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ discount_redeemed_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (profileError) {
      logStep("Warning: Could not update profile with redemption timestamp", { error: profileError });
    } else {
      logStep("Updated profile with discount redemption timestamp");
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "10% discount applied for the next 3 months"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
