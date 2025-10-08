import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONVERT-TRIAL-ADDONS] ${step}${detailsStr}`);
};

// Mapping of addon types to Stripe price IDs
const ADDON_PRICE_IDS = {
  bank_account: "price_1SF2J6B28kMY3UseQW6ATKt1",
  amazon_account: "price_1SEHQLB28kMY3UseBmY7IIjx",
  user: "price_1SEHQoB28kMY3UsedGTbBbmA"
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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if user is still in trial
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('trial_end')
      .eq('user_id', user.id)
      .single();

    if (profile?.trial_end && new Date(profile.trial_end) > new Date()) {
      throw new Error("User is still in trial period");
    }

    logStep("Trial ended, checking for add-on usage");

    // Get trial addon usage
    const { data: trialUsage, error: usageError } = await supabaseClient
      .from('trial_addon_usage')
      .select('*')
      .eq('user_id', user.id);

    if (usageError) throw usageError;

    if (!trialUsage || trialUsage.length === 0) {
      logStep("No trial add-on usage found");
      return new Response(JSON.stringify({ 
        success: true,
        message: "No add-ons to convert"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found trial usage", { count: trialUsage.length });

    // Find user's Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found");
    }
    
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });
    
    // Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }
    
    const subscription = subscriptions.data[0];
    logStep("Found active subscription", { subscriptionId: subscription.id });
    
    // Add each trial usage item to the subscription
    const addedItems = [];
    for (const usage of trialUsage) {
      if (usage.quantity > 0) {
        const priceId = ADDON_PRICE_IDS[usage.addon_type as keyof typeof ADDON_PRICE_IDS];
        
        logStep("Adding subscription item", { 
          type: usage.addon_type, 
          priceId, 
          quantity: usage.quantity 
        });
        
        const subscriptionItem = await stripe.subscriptionItems.create({
          subscription: subscription.id,
          price: priceId,
          quantity: usage.quantity,
          proration_behavior: 'create_prorations',
        });
        
        addedItems.push({
          type: usage.addon_type,
          itemId: subscriptionItem.id,
          quantity: usage.quantity
        });
        
        logStep("Added subscription item", { 
          itemId: subscriptionItem.id,
          type: usage.addon_type
        });
      }
    }
    
    // Delete trial usage records
    const { error: deleteError } = await supabaseClient
      .from('trial_addon_usage')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      logStep("Warning: Failed to delete trial usage records", { error: deleteError });
    } else {
      logStep("Deleted trial usage records");
    }

    logStep("Conversion completed", { addedCount: addedItems.length });

    return new Response(JSON.stringify({ 
      success: true,
      addedItems,
      message: `Successfully converted ${addedItems.length} trial add-ons to paid subscription`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});