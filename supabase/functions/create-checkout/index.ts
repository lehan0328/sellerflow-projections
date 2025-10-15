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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const body = await req.json();
    const { priceId, lineItems, proratedAmount } = body;
    
    // Support both single priceId and multiple lineItems
    let finalLineItems;
    if (lineItems && Array.isArray(lineItems)) {
      finalLineItems = lineItems;
      logStep("Received line items", { lineItems });
    } else if (priceId) {
      finalLineItems = [{ price: priceId, quantity: 1 }];
      logStep("Received price ID", { priceId, proratedAmount });
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

    // Check user's profile for referred user discount
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan_override, discount_redeemed_at')
      .eq('user_id', user.id)
      .single();
    
    const hasReferredUserDiscount = profile?.plan_override === 'referred_user_discount';
    const hasEverRedeemedDiscount = !!profile?.discount_redeemed_at;
    logStep("Checked user profile", { 
      hasReferredUserDiscount, 
      hasEverRedeemedDiscount,
      planOverride: profile?.plan_override 
    });

    // Check for existing customer or create new one
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    let hasExistingSubscription = false;
    let currentSubscription = null;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      const customer = customers.data[0];
      
      logStep("Existing customer found", { 
        customerId,
        customerEmail: customer.email,
        hasEmail: !!customer.email
      });
      
      // Update customer email if missing or different
      if (!customer.email || customer.email !== user.email) {
        await stripe.customers.update(customerId, {
          email: user.email,
        });
        logStep("Updated customer email", { email: user.email });
      }
      
      // Save stripe_customer_id to profile if not already saved
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id)
        .is('stripe_customer_id', null);
      
      if (!updateError) {
        logStep("Stripe customer ID saved to profile");
      }
      
      // Check ALL subscriptions to find current active one
      const allSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 100,
      });
      
      // Check for current active or trialing subscription
      currentSubscription = allSubscriptions.data.find(
        sub => sub.status === 'active' || sub.status === 'trialing'
      );
      
      hasExistingSubscription = !!currentSubscription;
      
      logStep("Checked subscription history", { 
        hasExistingSubscription,
        currentSubscriptionId: currentSubscription?.id,
        currentStatus: currentSubscription?.status,
        totalSubscriptions: allSubscriptions.data.length
      });
    } else {
      // Create new customer with email
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      });
      customerId = newCustomer.id;
      
      logStep("New customer created", { 
        customerId,
        email: user.email
      });
      
      // Save stripe_customer_id to profile
      await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
      logStep("Stripe customer ID saved to profile");
    }

    // Create or get the referred user discount coupon if applicable
    let discountCouponId = null;
    if (hasReferredUserDiscount && !hasEverRedeemedDiscount) {
      const couponId = 'referred_user_discount_10pct';
      try {
        // Try to retrieve existing coupon
        await stripe.coupons.retrieve(couponId);
        discountCouponId = couponId;
        logStep("Found existing referred user discount coupon");
      } catch (error) {
        // Create coupon if it doesn't exist (10% off for 12 months)
        logStep("Creating referred user discount coupon");
        await stripe.coupons.create({
          id: couponId,
          name: 'Referred User Discount - 10% Off',
          percent_off: 10,
          duration: 'repeating',
          duration_in_months: 6,
        });
        discountCouponId = couponId;
      }
      logStep("Will apply referred user discount", { couponId: discountCouponId });
    }

    // Create checkout session - simplified without trial logic
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: finalLineItems,
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard?subscription=success`,
      cancel_url: `${req.headers.get("origin")}/upgrade-plan?subscription=canceled`,
      payment_method_collection: "always", // Always require payment method
      subscription_data: {
        metadata: {
          user_id: user.id,
          user_email: user.email
        }
      }
    };
    
    // Apply referred user discount if applicable
    if (discountCouponId) {
      sessionConfig.discounts = [{
        coupon: discountCouponId
      }];
      logStep("Added discount to checkout session");
      
      // Mark discount as redeemed in profile ONLY after successfully creating checkout
      // This will happen in the try block below after session creation succeeds
    } else {
      // Only allow promotion codes if no automatic discount is being applied
      sessionConfig.allow_promotion_codes = true;
    }
    
    // Handle prorated upgrades - apply credit and keep same renewal date
    if (hasExistingSubscription && currentSubscription && proratedAmount !== undefined) {
      // For mid-cycle upgrades, update the existing subscription instead
      const currentPrice = currentSubscription.items.data[0].price.id;
      const newPriceId = finalLineItems[0].price;
      
      // Get pricing details to check if we're changing intervals
      const currentPriceDetails = await stripe.prices.retrieve(currentPrice);
      const newPriceDetails = await stripe.prices.retrieve(newPriceId);
      
      const currentInterval = currentPriceDetails.recurring?.interval;
      const newInterval = newPriceDetails.recurring?.interval;
      const isChangingInterval = currentInterval !== newInterval;
      
      logStep("Processing prorated upgrade", {
        currentPrice,
        newPriceId,
        proratedAmount,
        currentInterval,
        newInterval,
        isChangingInterval,
        currentPeriodEnd: currentSubscription.current_period_end
      });
      
      if (isChangingInterval) {
        // Can't keep billing anchor when changing intervals
        // For interval changes with prorated amounts, we need to charge immediately
        logStep("Changing billing interval", { 
          from: currentInterval,
          to: newInterval,
          hasProratedAmount: proratedAmount !== undefined
        });
        
        if (proratedAmount !== undefined && proratedAmount > 0) {
          // Cancel current subscription and create new one that charges immediately
          await stripe.subscriptions.update(currentSubscription.id, {
            cancel_at_period_end: true,
          });
          
          logStep("Cancelled current subscription, creating new with immediate charge");
          
          // Don't use trial - charge immediately for the prorated amount
          sessionConfig.subscription_data = {
            metadata: {
              upgraded_from: currentSubscription.id,
              prorated_amount: proratedAmount.toString()
            }
          };
          sessionConfig.mode = "subscription";
        } else {
          // No proration - use trial to avoid double charging
          const currentPeriodEnd = currentSubscription.current_period_end;
          
          await stripe.subscriptions.update(currentSubscription.id, {
            cancel_at_period_end: true,
          });
          
          logStep("Cancelled current subscription, creating new one with trial", { 
            trialEnd: currentPeriodEnd,
            trialEndDate: new Date(currentPeriodEnd * 1000).toISOString()
          });
          
          // Create checkout for new subscription starting after current period
          sessionConfig.subscription_data = {
            trial_end: currentPeriodEnd,
            metadata: {
              upgraded_from: currentSubscription.id
            }
          };
          sessionConfig.payment_method_collection = "if_required";
        }
      } else {
        // Same interval - update subscription directly with proration
        // Stripe Checkout doesn't support prorated upgrades, so we handle it server-side
        logStep("Updating subscription with proration (same interval)");
        
        await stripe.subscriptions.update(currentSubscription.id, {
          items: [{
            id: currentSubscription.items.data[0].id,
            price: newPriceId,
          }],
          proration_behavior: 'always_invoice', // Creates invoice for prorated amount
          billing_cycle_anchor: 'unchanged',
        });
        
        logStep("Subscription upgraded successfully");
        
        // Return success without checkout since upgrade is complete
        return new Response(JSON.stringify({ 
          url: `${req.headers.get("origin")}/dashboard?subscription=upgraded`,
          upgraded: true,
          message: 'Subscription upgraded successfully. You will receive an invoice for the prorated amount.'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }
    
    // If upgrading from existing subscription to yearly, schedule new subscription 
    // to start when current period ends (no immediate charge)
    if (hasExistingSubscription && currentSubscription && !proratedAmount) {
      const currentPeriodEnd = currentSubscription.current_period_end;
      sessionConfig.subscription_data = {
        trial_end: currentPeriodEnd, // New subscription starts after current one
        metadata: {
          upgraded_from: currentSubscription.id
        }
      };
      sessionConfig.payment_method_collection = "if_required";
      logStep("Scheduling new subscription after current period", { 
        currentPeriodEnd,
        currentPeriodEndDate: new Date(currentPeriodEnd * 1000).toISOString()
      });
    } else if (!hasExistingSubscription) {
      logStep("Creating standard subscription checkout - payment required");
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Mark discount as redeemed ONLY after successful checkout session creation
    if (discountCouponId) {
      await supabaseClient
        .from('profiles')
        .update({ 
          discount_redeemed_at: new Date().toISOString(),
          plan_override: null // Remove override once discount is applied
        })
        .eq('user_id', user.id);
      logStep("Marked discount as redeemed in profile after successful checkout creation");
    }

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
