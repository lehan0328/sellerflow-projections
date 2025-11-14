import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    // Check user's profile and fetch referral discount settings dynamically
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select(`
        plan_override, 
        discount_redeemed_at,
        referral_code
      `)
      .eq('user_id', user.id)
      .single();
    
    // Fetch referral code discount settings if user has a referral code
    let discountSettings = null;
    if (profile?.referral_code) {
      const { data: codeData } = await supabaseClient
        .from('referral_codes')
        .select('discount_percentage, duration_months, is_active, code_type')
        .eq('code', profile.referral_code)
        .single();
      
      if (codeData && codeData.is_active) {
        discountSettings = codeData;
        logStep("Fetched active referral code settings", { 
          code: profile.referral_code,
          percentage: codeData.discount_percentage,
          months: codeData.duration_months,
          type: codeData.code_type
        });
      } else if (codeData && !codeData.is_active) {
        logStep("Referral code is inactive, will not apply discount", { code: profile.referral_code });
      } else {
        logStep("Referral code not found in database", { code: profile.referral_code });
      }
    }
    
    const hasReferredUserDiscount = profile?.plan_override === 'referred_user_discount' || !!discountSettings;
    const hasEverRedeemedDiscount = !!profile?.discount_redeemed_at;
    logStep("Checked user profile", { 
      hasReferredUserDiscount, 
      hasEverRedeemedDiscount,
      planOverride: profile?.plan_override,
      referralCode: profile?.referral_code,
      hasDiscountSettings: !!discountSettings
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

    // Create or get the discount coupon if applicable with dynamic values
    let discountCouponId = null;
    if (hasReferredUserDiscount && !hasEverRedeemedDiscount) {
      // Determine discount percentage and duration
      let discountPercentage = 10; // Default for legacy users
      let durationMonths = 3; // Default for legacy users
      
      // Use dynamic settings from referral_codes table if available
      if (discountSettings) {
        discountPercentage = discountSettings.discount_percentage;
        durationMonths = discountSettings.duration_months;
        
        // Validate discount settings
        if (discountPercentage < 1 || discountPercentage > 100) {
          logStep("WARNING: Invalid discount percentage, using default 10%", { 
            invalidValue: discountPercentage 
          });
          discountPercentage = 10;
        }
        
        if (durationMonths < 1 || durationMonths > 36) {
          logStep("WARNING: Invalid duration months, using default 3", { 
            invalidValue: durationMonths 
          });
          durationMonths = 3;
        }
        
        logStep("Using dynamic discount settings", { 
          percentage: discountPercentage,
          months: durationMonths,
          source: 'referral_codes_table'
        });
      } else {
        logStep("Using legacy discount settings for backward compatibility", {
          percentage: discountPercentage,
          months: durationMonths,
          source: 'hardcoded_default'
        });
      }
      
      // Generate dynamic coupon ID based on discount settings
      const couponId = `discount_${discountPercentage}pct_${durationMonths}mo`;
      
      try {
        // Try to retrieve existing coupon
        const existingCoupon = await stripe.coupons.retrieve(couponId);
        
        // Verify existing coupon has correct settings
        if (existingCoupon.percent_off === discountPercentage && 
            existingCoupon.duration === 'repeating' &&
            existingCoupon.duration_in_months === durationMonths) {
          discountCouponId = couponId;
          logStep("Found existing discount coupon with correct settings", { couponId });
        } else {
          logStep("WARNING: Existing coupon has different settings", {
            couponId,
            existingPercent: existingCoupon.percent_off,
            existingMonths: existingCoupon.duration_in_months,
            expectedPercent: discountPercentage,
            expectedMonths: durationMonths
          });
          // Use existing coupon anyway to avoid conflicts
          discountCouponId = couponId;
        }
      } catch (error) {
        // Create coupon if it doesn't exist
        logStep("Creating new discount coupon", {
          couponId,
          percentage: discountPercentage,
          months: durationMonths
        });
        
        try {
          await stripe.coupons.create({
            id: couponId,
            name: `Referral Discount - ${discountPercentage}% Off for ${durationMonths} Months`,
            percent_off: discountPercentage,
            duration: 'repeating',
            duration_in_months: durationMonths,
          });
          discountCouponId = couponId;
          logStep("Successfully created discount coupon", { couponId });
        } catch (createError) {
          logStep("ERROR: Failed to create discount coupon", {
            error: createError.message,
            couponId
          });
          // Proceed without discount rather than failing checkout
          logStep("Proceeding with checkout without discount");
        }
      }
      
      if (discountCouponId) {
        logStep("Will apply discount to checkout", { 
          couponId: discountCouponId,
          percentage: discountPercentage,
          months: durationMonths
        });
      }
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
    
    // Handle subscription upgrades - schedule at end of billing cycle
    // Ignore proratedAmount parameter - all upgrades happen at cycle end
    if (hasExistingSubscription && currentSubscription) {
      const currentPeriodEnd = currentSubscription.current_period_end;
      
      // Validate currentPeriodEnd is a valid timestamp
      if (!currentPeriodEnd || typeof currentPeriodEnd !== 'number') {
        logStep("WARNING: Invalid current_period_end, creating direct checkout", { currentPeriodEnd });
      } else {
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
      }
    } else if (!hasExistingSubscription) {
      logStep("Creating standard subscription checkout - payment required");
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // NOTE: We do NOT mark the discount as redeemed here
    // The discount will be marked as redeemed by the stripe-payment-webhook
    // when the user actually completes payment. This allows users to:
    // 1. Cancel checkout and try different plans
    // 2. Only lose their discount when they actually subscribe
    // The webhook will check for the referred_user_discount plan_override
    // and mark it as redeemed upon successful payment

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
