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

// Timeout wrapper for async operations
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
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
    if (!authHeader) {
      logStep("No authorization header - user not authenticated");
      return new Response(JSON.stringify({ 
        subscribed: false,
        error: "Not authenticated"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      logStep("Authentication failed", { error: userError?.message });
      return new Response(JSON.stringify({ 
        subscribed: false,
        error: "Invalid or expired session"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check for plan override, trial status, and plan_tier
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan_override, discount_redeemed_at, trial_end, trial_start, plan_tier')
      .eq('user_id', user.id)
      .single();

    // Check if trial has expired and determine trial status
    const trialEnd = profile?.trial_end ? new Date(profile.trial_end) : null;
    const isTrialExpired = trialEnd ? trialEnd < new Date() : false;

    // Check for LIFETIME ACCESS grants only (tier-based or explicit lifetime)
    // Regular plan names (professional, enterprise, growing, starter) are NOT lifetime
    // referred_user_discount is just a discount flag, not access
    if (profile?.plan_override) {
      const isLifetimeAccess = 
        profile.plan_override.includes('tier') || 
        profile.plan_override === 'lifetime' || 
        profile.plan_override === 'lifetime_access';
      
      if (isLifetimeAccess) {
        const normalizedPlan = profile.plan_override.toLowerCase();
        logStep("Lifetime access grant found - bypassing all checks", { plan: normalizedPlan });
        
        return new Response(JSON.stringify({
          subscribed: true,
          plan: normalizedPlan,
          plan_tier: 'enterprise',  // Lifetime access gets enterprise tier
          subscription_end: null,
          is_override: true,
          is_trialing: trialEnd ? trialEnd > new Date() : false,
          discount_ever_redeemed: !!profile.discount_redeemed_at
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // If plan_override is set but NOT lifetime, log it but continue to Stripe check
      logStep("Plan override found but not lifetime access", { 
        plan: profile.plan_override,
        note: "Will check Stripe subscription status"
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await withTimeout(
      stripe.customers.list({ email: user.email, limit: 1 }),
      10000,
      "Stripe customers.list"
    );
    
    if (customers.data.length === 0) {
      logStep("No customer found - checking trial status");
      
      // Check if trial has expired
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('discount_redeemed_at, trial_end, trial_start')
        .eq('user_id', user.id)
        .single();
      
      const trialEnd = profileData?.trial_end ? new Date(profileData.trial_end) : null;
      const isTrialExpired = trialEnd ? trialEnd < new Date() : false;
      
      logStep("Trial status", { 
        trialEnd: profileData?.trial_end,
        isTrialExpired,
        isTrialing: !isTrialExpired && !!trialEnd
      });
      
      // Get plan_tier from profile for trial users
      const { data: profileWithTier } = await supabaseClient
        .from('profiles')
        .select('plan_tier, discount_redeemed_at, trial_end, trial_start')
        .eq('user_id', user.id)
        .single();
      
      return new Response(JSON.stringify({ 
        subscribed: false,
        trial_expired: isTrialExpired,
        is_trialing: !isTrialExpired && !!trialEnd,
        trial_end: profileData?.trial_end,
        trial_start: profileData?.trial_start,
        plan_tier: profileWithTier?.plan_tier || 'starter',
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
    const customer = await withTimeout(
      stripe.customers.retrieve(customerId, {
        expand: ['discount.coupon']
      }),
      10000,
      "Stripe customers.retrieve"
    );
    logStep("Customer retrieved", { 
      hasDiscount: !!(customer as any).discount,
      customerDiscountType: typeof (customer as any).discount 
    });

    // Check for ALL subscriptions (including canceled) with full discount expansion
    logStep("Fetching ALL subscriptions for customer");
    const allSubscriptions = await withTimeout(
      stripe.subscriptions.list({
        customer: customerId,
        limit: 100, // Increased limit to catch all
        expand: ['data.discount.coupon', 'data.latest_invoice', 'data.default_payment_method', 'data.items.data.price'],
      }),
      15000,
      "Stripe subscriptions.list"
    );
    
    // Separate main subscription from addon subscriptions
    const mainSubscriptions = allSubscriptions.data.filter(sub => 
      !sub.metadata?.is_addon || sub.metadata.is_addon !== "true"
    );
    
    const addonSubscriptions = allSubscriptions.data.filter(sub => 
      sub.metadata?.is_addon === "true" &&
      (sub.status === "active" || sub.status === "trialing")
    );
    
    logStep("Subscriptions separated", { 
      total: allSubscriptions.data.length,
      main: mainSubscriptions.length,
      addons: addonSubscriptions.length,
      addonDetails: addonSubscriptions.map(sub => ({
        id: sub.id,
        type: sub.metadata?.addon_type,
        status: sub.status
      }))
    });
    
    logStep("Main subscription data", { 
      count: mainSubscriptions.length,
      statuses: mainSubscriptions.map(s => s.status),
      subscriptionDetails: mainSubscriptions.map(s => ({
        id: s.id,
        status: s.status,
        current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null,
        cancel_at: s.cancel_at ? new Date(s.cancel_at * 1000).toISOString() : null,
        canceled_at: s.canceled_at ? new Date(s.canceled_at * 1000).toISOString() : null
      }))
    });
    
    // Filter for active, trialing, or past_due MAIN subscriptions (all count as subscribed)
    // Also include canceled subscriptions that are still in their paid period
    const activeOrTrialingSub = mainSubscriptions.find(sub => {
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
        .not('trial_end', 'is', null);  // Only update if trial_end exists
      
      if (updateError) {
        logStep("Error clearing trial fields", { error: updateError.message });
      } else {
        logStep("Cleared trial fields from profile for paid subscriber");
      }
    }

    // Check if user ever redeemed a discount and get plan_tier with trial dates
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('discount_redeemed_at, plan_tier, trial_end, trial_start')
      .eq('user_id', user.id)
      .single();

    const planTier = profileData?.plan_tier || 'starter';
    
    // CRITICAL: Check profile trial dates if no active Stripe subscription
    // This handles users who have a Stripe customer ID but are on profile-based trial
    if (!hasActiveSub && profileData?.trial_end) {
      const profileTrialEnd = new Date(profileData.trial_end);
      const profileIsTrialing = profileTrialEnd > new Date();
      
      if (profileIsTrialing) {
        logStep('User is on profile-based trial (has Stripe customer but no subscription)', {
          trial_end: profileData.trial_end,
          is_trialing: profileIsTrialing
        });
        isTrialing = true;
        subscriptionTrialEnd = profileData.trial_end;
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      is_override: false,
      is_trialing: isTrialing,
      trial_end: subscriptionTrialEnd,
      trial_start: profileData?.trial_start,
      plan_tier: planTier,
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
    const isTimeout = errorMessage.includes('timed out');
    logStep("ERROR in check-subscription", { 
      message: errorMessage,
      isTimeout,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return new Response(JSON.stringify({ 
      error: isTimeout ? 'Request timeout - please try again' : errorMessage,
      subscribed: false,
      is_timeout: isTimeout
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: isTimeout ? 408 : 500,
    });
  }
});