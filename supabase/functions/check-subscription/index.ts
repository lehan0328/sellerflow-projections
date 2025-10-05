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

    // Check for plan override first (lifetime access, special cases)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan_override, discount_redeemed_at')
      .eq('user_id', user.id)
      .single();

    if (profile?.plan_override) {
      logStep("Plan override found", { plan: profile.plan_override });
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
      logStep("No customer found, updating unsubscribed state");
      
      // Still check if user ever redeemed a discount
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('discount_redeemed_at')
        .eq('user_id', user.id)
        .single();
      
      return new Response(JSON.stringify({ 
        subscribed: false,
        discount_ever_redeemed: !!profile?.discount_redeemed_at
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active or trialing subscriptions with full discount expansion
    logStep("Fetching subscriptions with discount data");
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
      expand: ['data.discount.coupon'],
    });
    
    logStep("Raw subscriptions data", { 
      count: subscriptions.data.length,
      statuses: subscriptions.data.map(s => s.status)
    });
    
    // Filter for active or trialing subscriptions
    const activeOrTrialingSub = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );
    
    const hasActiveSub = !!activeOrTrialingSub;
    let productId = null;
    let subscriptionEnd = null;
    let isTrialing = false;
    let trialEnd = null;

    let discountInfo = null;

    if (hasActiveSub && activeOrTrialingSub) {
      const subscription = activeOrTrialingSub;
      isTrialing = subscription.status === 'trialing';
      
      logStep("Full subscription object", { 
        id: subscription.id,
        status: subscription.status,
        hasDiscount: !!subscription.discount,
        discountObject: subscription.discount
      });
      
      // If trialing, use trial_end, otherwise use current_period_end
      if (isTrialing && subscription.trial_end) {
        trialEnd = new Date(subscription.trial_end * 1000).toISOString();
        subscriptionEnd = trialEnd;
        logStep("Trial subscription found", { 
          subscriptionId: subscription.id, 
          trialEndDate: trialEnd 
        });
      } else {
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        logStep("Active subscription found", { 
          subscriptionId: subscription.id, 
          endDate: subscriptionEnd 
        });
      }
      
      productId = subscription.items.data[0].price.product as string;
      
      // Check for active discount - handle both expanded and non-expanded cases
      logStep("Checking for discount", { 
        hasDiscountProperty: !!subscription.discount,
        discountType: typeof subscription.discount,
        discountKeys: subscription.discount ? Object.keys(subscription.discount) : []
      });
      
      if (subscription.discount) {
        // The discount object might be a string ID or an expanded object
        const discount = subscription.discount as any;
        const coupon = discount.coupon;
        
        if (coupon) {
          logStep("Coupon found", { 
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
          logStep("Discount info created", discountInfo);
        } else {
          logStep("Discount exists but no coupon found", { discount });
        }
      } else {
        logStep("No discount property on subscription");
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
      trial_end: trialEnd,
      discount: discountInfo,
      discount_ever_redeemed: !!profileData?.discount_redeemed_at
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