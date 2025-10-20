import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const isWebsiteAdmin = user.email === 'chuandy914@gmail.com';
    if (!isWebsiteAdmin) {
      throw new Error("Admin access required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Fetch all profiles with Stripe customer IDs to check their subscriptions
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('*')
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // Get all users to map emails
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers();
    if (usersError) throw usersError;

    const emailMap = new Map(users.map(u => [u.id, u.email || '']));

    // Enrich profiles with Stripe subscription data
    const allProfiles = await Promise.all(
      (profiles || []).map(async (profile) => {
        const email = emailMap.get(profile.user_id) || '';
        let stripeData = null;

        if (profile.stripe_customer_id) {
          try {
            // Get Stripe subscriptions for this customer
            const stripeSubs = await stripe.subscriptions.list({
              customer: profile.stripe_customer_id,
              status: 'active',
              limit: 1
            });

            if (stripeSubs.data.length > 0) {
              const sub = stripeSubs.data[0];
              const price = sub.items.data[0]?.price;
              
              stripeData = {
                subscription_id: sub.id,
                status: sub.status,
                plan_name: price?.nickname || profile.plan_override,
                amount: price?.unit_amount ? (price.unit_amount / 100) : 0,
                currency: price?.currency || 'usd',
                interval: price?.recurring?.interval || 'month',
                current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                cancel_at_period_end: sub.cancel_at_period_end
              };
            }
          } catch (stripeError) {
            console.error(`Error fetching Stripe data for ${profile.stripe_customer_id}:`, stripeError);
          }
        }

        return {
          id: profile.user_id,
          email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          company: profile.company,
          plan_override: profile.plan_override,
          stripe_customer_id: profile.stripe_customer_id,
          account_status: profile.account_status,
          created_at: profile.created_at,
          stripe_data: stripeData
        };
      })
    );

    // Filter to only show profiles with active Stripe subscriptions
    const subscriptions = allProfiles.filter(profile => profile.stripe_data !== null);

    // Calculate summary stats
    const totalMRR = subscriptions.reduce((sum, sub) => {
      if (sub.stripe_data?.amount) {
        const monthlyAmount = sub.stripe_data.interval === 'year' 
          ? sub.stripe_data.amount / 12 
          : sub.stripe_data.amount;
        return sum + monthlyAmount;
      }
      return sum;
    }, 0);

    const activeCount = subscriptions.filter(s => s.account_status === 'active').length;

    return new Response(
      JSON.stringify({
        subscriptions,
        summary: {
          totalSubscriptions: subscriptions.length,
          activeSubscriptions: activeCount,
          totalMRR,
          churnRate: 0 // Would need historical data to calculate
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in get-admin-subscriptions:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
