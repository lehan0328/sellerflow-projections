import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPGRADE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

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

    const { newPriceId } = await req.json();
    if (!newPriceId) throw new Error("newPriceId is required");
    logStep("Received upgrade request", { newPriceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found");
    }
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Get active subscription
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

    // Get the new price to check billing interval
    let newPrice;
    try {
      newPrice = await stripe.prices.retrieve(newPriceId);
      logStep("Retrieved new price", { 
        interval: newPrice.recurring?.interval,
        priceId: newPriceId 
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logStep("ERROR retrieving price", { error: msg });
      throw new Error(`Failed to retrieve price: ${msg}`);
    }
    
    const currentPrice = subscription.items.data[0].price;
    logStep("Current price details", { 
      interval: currentPrice.recurring?.interval,
      priceId: currentPrice.id 
    });
    
    // Check if billing interval is changing
    const intervalChanging = newPrice.recurring?.interval !== currentPrice.recurring?.interval;
    logStep("Interval comparison", { 
      intervalChanging,
      newInterval: newPrice.recurring?.interval,
      currentInterval: currentPrice.recurring?.interval
    });
    
    // Update subscription - Stripe handles proration automatically
    const updateParams: any = {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations', // Creates invoice for prorated amount
      payment_behavior: 'error_if_incomplete', // Fail immediately if payment doesn't succeed
    };
    
    // Only preserve billing cycle if interval is NOT changing
    if (!intervalChanging) {
      updateParams.billing_cycle_anchor = 'unchanged';
      logStep("Keeping billing cycle unchanged");
    } else {
      logStep("Allowing new billing cycle due to interval change");
    }
    
    logStep("Updating subscription with params", updateParams);
    let updatedSubscription;
    try {
      updatedSubscription = await stripe.subscriptions.update(subscription.id, updateParams);
      logStep("Subscription update API call completed", { 
        status: updatedSubscription.status,
        latestInvoice: updatedSubscription.latest_invoice 
      });
    } catch (updateError) {
      const msg = updateError instanceof Error ? updateError.message : String(updateError);
      logStep("ERROR updating subscription", { error: msg });
      
      // Payment failed during upgrade - subscription was not changed
      return new Response(JSON.stringify({ 
        error: 'Payment declined - plan upgrade failed. Your original plan remains active.',
        details: msg
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 402, // Payment Required
      });
    }

    // Wait a moment for Stripe to process the invoice
    await new Promise(resolve => setTimeout(resolve, 2000));

    logStep("Subscription updated, verifying payment");

    // Get the latest invoice to verify payment was successful
    const invoice = await stripe.invoices.retrieve(updatedSubscription.latest_invoice as string);
    logStep("Retrieved invoice", { 
      invoiceId: invoice.id,
      status: invoice.status,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid 
    });
    
    // Check if payment actually succeeded
    // Invoice must be 'paid' for upgrade to be successful
    if (invoice.status !== 'paid') {
      logStep("Payment not completed for upgrade", { 
        invoiceStatus: invoice.status,
        paymentIntent: invoice.payment_intent 
      });
      
      // Revert the subscription back to original price
      logStep("Reverting subscription to original plan");
      try {
        await stripe.subscriptions.update(subscription.id, {
          items: [{
            id: subscription.items.data[0].id,
            price: currentPrice.id,
          }],
          proration_behavior: 'none',
          billing_cycle_anchor: 'unchanged',
        });
        logStep("Successfully reverted subscription to original plan");
      } catch (revertError) {
        const revertMsg = revertError instanceof Error ? revertError.message : String(revertError);
        logStep("ERROR reverting subscription", { error: revertMsg });
      }
      
      return new Response(JSON.stringify({ 
        error: 'Payment declined - upgrade failed. Your original plan remains active.',
        invoiceStatus: invoice.status
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 402,
      });
    }
    
    logStep("Payment verified successful", { invoiceId: invoice.id });
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Subscription upgraded successfully',
      amountCharged: invoice.amount_paid,
      currency: invoice.currency,
      invoiceUrl: invoice.hosted_invoice_url
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
