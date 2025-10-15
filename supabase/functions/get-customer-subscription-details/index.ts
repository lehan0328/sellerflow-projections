import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin access - only website admin chuandy914@gmail.com
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Check if user is the website admin
    const WEBSITE_ADMIN_EMAIL = 'chuandy914@gmail.com';
    if (user.email !== WEBSITE_ADMIN_EMAIL) {
      throw new Error("Admin access required");
    }

    const { customerId } = await req.json();
    if (!customerId) throw new Error("Customer ID required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists in Stripe
    let customerExists = false;
    try {
      await stripe.customers.retrieve(customerId);
      customerExists = true;
    } catch (error) {
      console.error("Customer not found in Stripe:", customerId);
      return new Response(
        JSON.stringify({
          renewal_date: null,
          last_paid_date: null,
          has_active_subscription: false,
          plan_name: null,
          subscription_status: null,
          customer_exists: false,
          error: "Customer not found in Stripe"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get all subscriptions (active, past_due, trialing)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    let renewalDate = null;
    let lastPaidDate = null;
    let hasActiveSubscription = false;
    let planName = null;
    let subscriptionStatus = null;

    // Check for any active, trialing, or past_due subscription
    const activeSubscription = subscriptions.data.find(sub => 
      ['active', 'trialing', 'past_due'].includes(sub.status)
    );

    if (activeSubscription) {
      hasActiveSubscription = activeSubscription.status === 'active';
      subscriptionStatus = activeSubscription.status;
      
      // Renewal date is the current period end
      if (activeSubscription.current_period_end) {
        renewalDate = new Date(activeSubscription.current_period_end * 1000).toISOString();
      }

      // Get plan name from the subscription items
      if (activeSubscription.items.data.length > 0) {
        const priceId = activeSubscription.items.data[0].price.id;
        // Fetch price details to get the product name
        try {
          const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
          if (price.product && typeof price.product === 'object') {
            planName = price.product.name;
          }
        } catch (error) {
          console.error("Error fetching price/product:", error);
        }
      }

      // Get the most recent paid invoice for this customer
      const invoices = await stripe.invoices.list({
        customer: customerId,
        status: "paid",
        limit: 1,
      });

      if (invoices.data.length > 0 && invoices.data[0].status_transitions.paid_at) {
        lastPaidDate = new Date(invoices.data[0].status_transitions.paid_at * 1000).toISOString();
      }
    }

    return new Response(
      JSON.stringify({
        renewal_date: renewalDate,
        last_paid_date: lastPaidDate,
        has_active_subscription: hasActiveSubscription,
        plan_name: planName,
        subscription_status: subscriptionStatus,
        customer_exists: customerExists,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});