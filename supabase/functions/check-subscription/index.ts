import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check for plan override and trial status
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan_override, discount_redeemed_at, trial_end')
      .eq('user_id', user.id)
      .single();

    // Check if trial has expired
    const trialEnd = profile?.trial_end ? new Date(profile.trial_end) : null;
    const isTrialExpired = trialEnd ? trialEnd < new Date() : false;

    // referred_user_discount is NOT a subscription - it's just a discount flag
    // Only check plan_override if it's NOT referred_user_discount
    if (profile?.plan_override && profile.plan_override !== 'referred_user_discount') {
      logStep("Plan override found", { plan: profile.plan_override, trialEnd: profile?.trial_end, isTrialExpired });
      
      // If trial is expired, return trial_expired status even with plan override
      if (isTrialExpired) {
        return new Response(JSON.stringify({ 
          subscribed: false,
          trial_expired: true,
          trial_end: profile.trial_end,
          discount_ever_redeemed: !!profile.discount_redeemed_at
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      return new Response(JSON.stringify({
        subscribed: true,
        plan: profile.plan_override,
        subscription_end: null,
        is_override: true,
        discount_ever_redeemed: !!profile.discount_redeemed_at
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found - checking trial status");
      
      // Check if trial has expired
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('discount_redeemed_at, trial_end')
        .eq('user_id', user.id)
        .single();
      
      const trialEnd = profileData?.trial_end ? new Date(profileData.trial_end) : null;
      const isTrialExpired = trialEnd ? trialEnd < new Date() : false;
      
      logStep("Trial status", { 
        trialEnd: profileData?.trial_end,
        isTrialExpired 
      });
      
      return new Response(JSON.stringify({ 
        subscribed: false,
        trial_expired: isTrialExpired,
        trial_end: profileData?.trial_end,
        discount_ever_redeemed: !!profileData?.discount_redeemed_at
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Save stripe_customer_id to profile if not already saved
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id)
      .is('stripe_customer_id', null);
    
    if (!updateError) {
      logStep("Stripe customer ID saved to profile");
    }

    // Fetch customer with discount info
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['discount.coupon']
    });
    logStep("Customer retrieved", { 
      hasDiscount: !!(customer as any).discount,
      customerDiscountType: typeof (customer as any).discount 
    });

    // Check for active or trialing subscriptions with full discount expansion
    logStep("Fetching subscriptions with discount data");
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
      expand: ['data.discount.coupon', 'data.latest_invoice', 'data.default_payment_method', 'data.items.data.price'],
    });
    
    logStep("Raw subscriptions data", { 
      count: subscriptions.data.length,
      statuses: subscriptions.data.map(s => s.status)
    });
    
    // Filter for active, trialing, or past_due subscriptions (all count as subscribed)
    // Also include canceled subscriptions that are still in their paid period
    const activeOrTrialingSub = subscriptions.data.find(sub => {
      if (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due') {
        return true;
      }
      // Include canceled subscriptions that haven't reached their period end yet
      if (sub.status === 'canceled' && sub.current_period_end) {
        const periodEnd = new Date(sub.current_period_end * 1000);
        const now = new Date();
        const stillActive = periodEnd > now;
        if (stillActive) {
          logStep("Found canceled subscription still in paid period", {
            subscriptionId: sub.id,
            periodEnd: periodEnd.toISOString(),
            daysRemaining: Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          });
        }
        return stillActive;
      }
      return false;
    });
    
    // User is considered subscribed if they have any of these statuses
    const hasActiveSub = !!activeOrTrialingSub;
    const isPastDue = activeOrTrialingSub?.status === 'past_due';
    let productId = null;
    let subscriptionEnd = null;
    let isTrialing = false;
    let subscriptionTrialEnd = null;
    let billingInterval = null;
    let currentPeriodStart = null;
    let priceAmount = null;
    let currency = null;

    let discountInfo = null;
    
    // Log status for debugging
    if (isPastDue) {
      logStep("Subscription past due - maintaining access with warning", { 
        subscriptionId: activeOrTrialingSub?.id 
      });
    }

    if (hasActiveSub && activeOrTrialingSub) {
      const subscription = activeOrTrialingSub;
      isTrialing = subscription.status === 'trialing';
      
      // Log all top-level keys to debug missing fields
      logStep("Subscription object keys", { 
        keys: Object.keys(subscription),
        id: subscription.id,
        status: subscription.status
      });
      
      logStep("Full subscription object", { 
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        trial_start: subscription.trial_start,
        trial_end: subscription.trial_end,
        hasDiscount: !!subscription.discount,
        discountObject: subscription.discount,
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancel_at: subscription.cancel_at,
        canceled_at: subscription.canceled_at
      });
      
      // If trialing, use trial_end, otherwise use billing_cycle_anchor
      if (isTrialing && subscription.trial_end) {
        try {
          subscriptionTrialEnd = new Date(subscription.trial_end * 1000).toISOString();
          subscriptionEnd = subscriptionTrialEnd;
          logStep("Trial subscription found", { 
            subscriptionId: subscription.id, 
            trialEndDate: subscriptionTrialEnd 
          });
        } catch (error) {
          logStep("Error parsing trial_end date", { 
            trial_end: subscription.trial_end,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Use billing_cycle_anchor for the current period start
      if (subscription.billing_cycle_anchor) {
        try {
          currentPeriodStart = new Date(subscription.billing_cycle_anchor * 1000).toISOString();
          logStep("Billing cycle anchor found", { currentPeriodStart });
          
          // Calculate next billing date based on interval
          const price = subscription.items.data[0].price;
          billingInterval = price.recurring?.interval || null;
          
          if (!isTrialing && billingInterval) {
            const anchorDate = new Date(subscription.billing_cycle_anchor * 1000);
            let nextBillingDate = new Date(anchorDate);
            
            if (billingInterval === 'month') {
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            } else if (billingInterval === 'year') {
              nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
            }
            
            subscriptionEnd = nextBillingDate.toISOString();
            logStep("Calculated next billing date", { 
              subscriptionId: subscription.id, 
              billingInterval,
              nextBillingDate: subscriptionEnd 
            });
          }
        } catch (error) {
          logStep("Error processing billing_cycle_anchor", { 
            billing_cycle_anchor: subscription.billing_cycle_anchor,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      } else {
        logStep("No billing_cycle_anchor found", { 
          subscriptionId: subscription.id,
          status: subscription.status 
        });
      }
      
      productId = subscription.items.data[0].price.product as string;
      
      // Get billing details
      const price = subscription.items.data[0].price;
      billingInterval = price.recurring?.interval || null;
      priceAmount = price.unit_amount || null;
      currency = price.currency || 'usd';
      
      // Get current period start (use billing_cycle_anchor as it's the actual field Stripe provides)
      if (subscription.billing_cycle_anchor) {
        try {
          currentPeriodStart = new Date(subscription.billing_cycle_anchor * 1000).toISOString();
          logStep("Current period start set from billing_cycle_anchor", { currentPeriodStart });
        } catch (error) {
          logStep("Error parsing billing_cycle_anchor for current period", { 
            billing_cycle_anchor: subscription.billing_cycle_anchor,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      } else {
        logStep("No billing_cycle_anchor found", { subscriptionId: subscription.id });
      }
      
      logStep("Billing details extracted", { 
        billingInterval,
        priceAmount,
        currency,
        currentPeriodStart,
        hasBillingCycleAnchor: !!subscription.billing_cycle_anchor
      });
      
      // Check for discount on subscription first
      logStep("Checking for discount", { 
        hasDiscountProperty: !!subscription.discount,
        discountType: typeof subscription.discount,
        discountKeys: subscription.discount ? Object.keys(subscription.discount) : []
      });
      
      if (subscription.discount) {
        const discount = subscription.discount as any;
        const coupon = discount.coupon;
        
        if (coupon) {
          logStep("Coupon found on subscription", { 
            couponId: coupon.id,
            percentOff: coupon.percent_off,
            amountOff: coupon.amount_off,
            duration: coupon.duration,
            durationInMonths: coupon.duration_in_months
          });
          
          discountInfo = {
            coupon_id: coupon.id,
            percent_off: coupon.percent_off || null,
            amount_off: coupon.amount_off || null,
            duration: coupon.duration,
            duration_in_months: coupon.duration_in_months || null,
          };
          logStep("Discount info created from subscription", discountInfo);
        }
      }
      
      // If no discount on subscription, check customer-level discount
      if (!discountInfo && (customer as any).discount) {
        const customerDiscount = (customer as any).discount;
        const coupon = customerDiscount.coupon;
        
        if (coupon) {
          logStep("Coupon found on customer", { 
            couponId: coupon.id,
            percentOff: coupon.percent_off,
            amountOff: coupon.amount_off,
            duration: coupon.duration,
            durationInMonths: coupon.duration_in_months
          });
          
          discountInfo = {
            coupon_id: coupon.id,
            percent_off: coupon.percent_off || null,
            amount_off: coupon.amount_off || null,
            duration: coupon.duration,
            duration_in_months: coupon.duration_in_months || null,
          };
          logStep("Discount info created from customer", discountInfo);
        }
      }
      
      if (!discountInfo) {
        logStep("No discount found on subscription or customer");
      }
      
      logStep("Final subscription data", { 
        productId, 
        isTrialing, 
        hasDiscount: !!discountInfo,
        discountInfo 
      });
    } else {
      logStep("No active or trialing subscription found");
    }

    // Clear trial fields from profile if user has an active paid subscription
    if (hasActiveSub && !isTrialing) {
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ 
          trial_start: null, 
          trial_end: null,
          plan_override: null
        })
        .eq('user_id', user.id)
        .is('trial_end', 'not.null');  // Only update if trial_end exists
      
      if (updateError) {
        logStep("Error clearing trial fields", { error: updateError.message });
      } else {
        logStep("Cleared trial fields from profile for paid subscriber");
      }
    }

    // Check if user ever redeemed a discount
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('discount_redeemed_at')
      .eq('user_id', user.id)
      .single();

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      is_override: false,
      is_trialing: isTrialing,
      trial_end: subscriptionTrialEnd,
      billing_interval: billingInterval,
      current_period_start: currentPeriodStart,
      price_amount: priceAmount,
      currency: currency,
      discount: discountInfo,
      discount_ever_redeemed: !!profileData?.discount_redeemed_at,
      payment_failed: isPastDue,
      cancel_at_period_end: activeOrTrialingSub?.cancel_at_period_end || false,
      cancel_at: activeOrTrialingSub?.cancel_at ? new Date(activeOrTrialingSub.cancel_at * 1000).toISOString() : null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});