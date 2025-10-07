import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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
    logStep("Function started");

    const body = await req.json();
    const { priceId, lineItems } = body;
    
    // Support both single priceId and multiple lineItems
    let finalLineItems;
    if (lineItems && Array.isArray(lineItems)) {
      finalLineItems = lineItems;
      logStep("Received line items", { lineItems });
    } else if (priceId) {
      finalLineItems = [{ price: priceId, quantity: 1 }];
      logStep("Received price ID", { priceId });
    } else {
      throw new Error("Either priceId or lineItems is required");
    }

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    let hasExistingSubscription = false;
    let hasEverHadTrial = false;
    let currentSubscription = null;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      const customer = customers.data[0];
      logStep("Existing customer found", { customerId });
      
      // Check metadata for trial usage tracking
      hasEverHadTrial = customer.metadata?.trial_used === 'true';
      logStep("Customer trial history from metadata", { hasEverHadTrial });
      
      // Check ALL subscriptions (including canceled) to verify trial usage
      const allSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 100, // Get all subscriptions to check history
      });
      
      // Check if customer has ever had a trial (even if canceled)
      const hadTrialBefore = allSubscriptions.data.some(
        sub => sub.trial_end !== null || sub.status === 'trialing'
      );
      
      if (hadTrialBefore && !hasEverHadTrial) {
        // Update customer metadata to mark trial as used
        await stripe.customers.update(customerId, {
          metadata: { trial_used: 'true' }
        });
        hasEverHadTrial = true;
        logStep("Updated customer metadata - trial marked as used");
      }
      
      // Check for current active or trialing subscription
      currentSubscription = allSubscriptions.data.find(
        sub => sub.status === 'active' || sub.status === 'trialing'
      );
      
      hasExistingSubscription = !!currentSubscription;
      
      logStep("Checked subscription history", { 
        hasExistingSubscription,
        hasEverHadTrial,
        currentSubscriptionId: currentSubscription?.id,
        currentStatus: currentSubscription?.status,
        totalSubscriptions: allSubscriptions.data.length
      });
    } else {
      // New customer - create with metadata
      logStep("New customer - will track trial usage");
    }

    // Create checkout session
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: finalLineItems,
      mode: "subscription",
      payment_method_collection: "if_required", // No card needed for trial
      success_url: `${req.headers.get("origin")}/dashboard?subscription=success`,
      cancel_url: `${req.headers.get("origin")}/upgrade-plan?subscription=canceled`,
    };
    
    // If new customer is created, mark trial as used in metadata
    if (!customerId) {
      sessionConfig.customer_creation = "always";
      sessionConfig.subscription_data = {
        metadata: {
          trial_used: 'true'
        }
      };
    }
    
    // Trial logic: Only offer trial if customer has NEVER had one before
    if (!hasEverHadTrial && !hasExistingSubscription) {
      sessionConfig.subscription_data = {
        ...sessionConfig.subscription_data,
        trial_period_days: 7,
      };
      logStep("Adding 7-day trial for first-time customer");
    } else if (hasEverHadTrial && !hasExistingSubscription) {
      logStep("Skipping trial - customer has used trial before");
    } else if (hasExistingSubscription && currentSubscription) {
      // When upgrading from existing subscription, schedule new subscription 
      // to start when current period ends (no immediate charge)
      const currentPeriodEnd = currentSubscription.current_period_end;
      sessionConfig.subscription_data = {
        ...sessionConfig.subscription_data,
        trial_end: currentPeriodEnd, // New subscription starts after current one
      };
      logStep("Scheduling new subscription after current period", { 
        currentPeriodEnd,
        currentPeriodEndDate: new Date(currentPeriodEnd * 1000).toISOString()
      });
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
