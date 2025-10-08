import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPLY-REFERRAL-DISCOUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's referral rewards
    const { data: rewards, error: rewardsError } = await supabaseClient
      .from("referral_rewards")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (rewardsError || !rewards) {
      logStep("No rewards found for user");
      return new Response(
        JSON.stringify({ message: "No referral rewards found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Rewards found", { tier: rewards.tier_level, discount: rewards.discount_percentage });

    // Check if discount is still valid
    if (rewards.discount_end_date && new Date(rewards.discount_end_date) < new Date()) {
      logStep("Discount expired");
      return new Response(
        JSON.stringify({ message: "Discount has expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found");
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription found");
      return new Response(
        JSON.stringify({ message: "No active subscription to apply discount to" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const subscription = subscriptions.data[0];
    logStep("Found active subscription", { subscriptionId: subscription.id });

    // Create or get coupon for this tier
    let couponId = `referral_tier_${rewards.tier_level}`;
    
    try {
      // Try to retrieve existing coupon
      await stripe.coupons.retrieve(couponId);
    } catch (error) {
      // Create coupon if it doesn't exist
      logStep("Creating new coupon", { couponId, percent: rewards.discount_percentage });
      
      if (rewards.tier_level === 7) {
        // 100 referrals = 6 months free (100% off for 6 months)
        await stripe.coupons.create({
          id: couponId,
          name: `Referral Tier ${rewards.tier_level} - 100 Referrals`,
          percent_off: 100,
          duration: "repeating",
          duration_in_months: 6,
        });
      } else {
        // Other tiers: percentage off for 3 months
        await stripe.coupons.create({
          id: couponId,
          name: `Referral Tier ${rewards.tier_level}`,
          percent_off: rewards.discount_percentage,
          duration: "repeating",
          duration_in_months: 3,
        });
      }
    }

    // Apply coupon to subscription
    logStep("Applying coupon to subscription");
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      coupon: couponId,
    });

    logStep("Discount applied successfully", { subscriptionId: updatedSubscription.id });

    return new Response(
      JSON.stringify({
        success: true,
        message: `${rewards.discount_percentage}% discount applied to your subscription`,
        tier: rewards.tier_level,
        discount: rewards.discount_percentage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
