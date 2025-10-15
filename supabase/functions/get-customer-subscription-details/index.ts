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

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let renewalDate = null;
    let lastPaidDate = null;
    let hasActiveSubscription = false;

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      hasActiveSubscription = true;
      // Renewal date is the current period end
      renewalDate = new Date(subscription.current_period_end * 1000).toISOString();

      // Get the most recent paid invoice for this customer
      const invoices = await stripe.invoices.list({
        customer: customerId,
        status: "paid",
        limit: 1,
      });

      if (invoices.data.length > 0) {
        lastPaidDate = new Date(invoices.data[0].status_transitions.paid_at! * 1000).toISOString();
      }
    }

    return new Response(
      JSON.stringify({
        renewal_date: renewalDate,
        last_paid_date: lastPaidDate,
        has_active_subscription: hasActiveSubscription,
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