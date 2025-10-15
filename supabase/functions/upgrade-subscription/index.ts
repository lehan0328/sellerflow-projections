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
    
    // CRITICAL: Use strict payment behavior to prevent upgrade if payment fails
    // For interval changes, we need to reset the billing cycle
    const updateParams: any = {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
      payment_behavior: 'error_if_incomplete', // STRICT: Fail immediately if payment incomplete
    };
    
    // Only preserve billing cycle anchor if NOT changing intervals
    if (!intervalChanging) {
      updateParams.billing_cycle_anchor = 'unchanged';
    }
    // If changing intervals, omit billing_cycle_anchor to reset it
    
    logStep("STRICT PAYMENT MODE: Updating subscription with error_if_incomplete", updateParams);
    let updatedSubscription;
    try {
      updatedSubscription = await stripe.subscriptions.update(subscription.id, updateParams);
      logStep("Stripe API call completed", { 
        status: updatedSubscription.status,
        latestInvoice: updatedSubscription.latest_invoice 
      });
      
      // CRITICAL CHECK: If status is not 'active', payment failed
      if (updatedSubscription.status !== 'active') {
        logStep("CRITICAL: Subscription status not active after update", { 
          status: updatedSubscription.status 
        });
        throw new Error(`Subscription status is ${updatedSubscription.status}, not active`);
      }
    } catch (updateError) {
      const msg = updateError instanceof Error ? updateError.message : String(updateError);
      logStep("CRITICAL ERROR: Subscription update failed", { error: msg });
      
      // Payment failed - subscription should NOT have been changed due to error_if_incomplete
      return new Response(JSON.stringify({ 
        error: 'Payment declined - your card was not charged. Your original plan remains active.',
        details: msg,
        critical: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 402,
      });
    }

    // CRITICAL: Wait and verify payment completed successfully
    logStep("Waiting for invoice processing...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Retrieve and verify the invoice payment status
    const invoice = await stripe.invoices.retrieve(updatedSubscription.latest_invoice as string);
    logStep("PAYMENT VERIFICATION - Invoice retrieved", { 
      invoiceId: invoice.id,
      status: invoice.status,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      paymentIntent: invoice.payment_intent
    });
    
    // STRICT VERIFICATION: Invoice MUST be 'paid' for upgrade to succeed
    // Any other status means payment failed or is incomplete
    if (invoice.status !== 'paid') {
      logStep("CRITICAL: Payment NOT completed - REVERTING subscription", { 
        invoiceStatus: invoice.status,
        reason: 'Invoice status is not paid'
      });
      
      // IMMEDIATE REVERT to original plan
      try {
        const revertedSub = await stripe.subscriptions.update(subscription.id, {
          items: [{
            id: subscription.items.data[0].id,
            price: currentPrice.id,
          }],
          proration_behavior: 'none',
          billing_cycle_anchor: 'unchanged',
        });
        logStep("SUCCESSFULLY REVERTED subscription", { 
          subscriptionId: revertedSub.id,
          currentPrice: currentPrice.id,
          status: revertedSub.status
        });
        
        // Cancel the unpaid invoice
        if (invoice.status === 'open') {
          await stripe.invoices.voidInvoice(invoice.id);
          logStep("Voided unpaid invoice", { invoiceId: invoice.id });
        }
      } catch (revertError) {
        const revertMsg = revertError instanceof Error ? revertError.message : String(revertError);
        logStep("CRITICAL ERROR: Failed to revert subscription", { error: revertMsg });
        // This is a critical error - subscription may be in wrong state
      }
      
      return new Response(JSON.stringify({ 
        error: 'Payment declined - your card was not charged. Your original plan has been restored.',
        invoiceStatus: invoice.status,
        reverted: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 402,
      });
    }
    
    // SUCCESS: Payment verified as paid
    logStep("SUCCESS: Payment verified and completed", { 
      invoiceId: invoice.id,
      amountPaid: invoice.amount_paid 
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Subscription upgraded successfully and payment confirmed',
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
