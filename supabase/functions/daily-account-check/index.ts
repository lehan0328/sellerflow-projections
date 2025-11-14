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

  try {
    logStep("Starting daily account check");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get all profiles that aren't already suspended or trial expired
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, email, trial_end, account_status')
      .not('account_status', 'in', '(suspended_payment,trial_expired)');

    if (profilesError) {
      logStep("Error fetching profiles", { error: profilesError });
      throw profilesError;
    }

    logStep(`Found ${profiles?.length || 0} profiles to check`);

    let suspendedCount = 0;

    for (const profile of profiles || []) {
      try {
        const now = new Date();
        const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null;
        const isTrialActive = trialEnd && trialEnd > now;

        // If trial is active, skip Stripe check
        if (isTrialActive) {
          logStep(`User ${profile.user_id} has active trial, skipping`);
          continue;
        }

        // Check Stripe subscription status
        const customers = await stripe.customers.list({ 
          email: profile.email, 
          limit: 1 
        });

        if (customers.data.length === 0) {
          // No Stripe customer and no active trial - trial expired (never paid)
          logStep(`No Stripe customer found for ${profile.email}, marking trial expired`);
          await supabaseClient
            .from('profiles')
            .update({ 
              account_status: 'trial_expired',
              payment_failure_date: now.toISOString()
            })
            .eq('user_id', profile.user_id);
          suspendedCount++;
          continue;
        }

        const customerId = customers.data[0].id;
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'all',
          limit: 100, // Get more subscriptions to check history
        });

        const hasActiveSubscription = subscriptions.data.some(sub => 
          sub.status === 'active' || sub.status === 'trialing'
        );

        if (!hasActiveSubscription) {
          // Check if user had a previous active subscription
          const hadPreviousSubscription = subscriptions.data.some(sub => 
            sub.status === 'canceled' || sub.status === 'past_due' || sub.status === 'unpaid'
          );

          if (hadPreviousSubscription) {
            // Had subscription before, payment failed - suspend for payment issue
            logStep(`Payment failed for ${profile.email}, suspending`);
            await supabaseClient
              .from('profiles')
              .update({ 
                account_status: 'suspended_payment',
                payment_failure_date: now.toISOString()
              })
              .eq('user_id', profile.user_id);
          } else {
            // Never had active subscription - trial expired
            logStep(`Trial expired for ${profile.email}, no subscription history`);
            await supabaseClient
              .from('profiles')
              .update({ 
                account_status: 'trial_expired',
                payment_failure_date: now.toISOString()
              })
              .eq('user_id', profile.user_id);
          }
          suspendedCount++;
        }
      } catch (error) {
        logStep(`Error checking user ${profile.user_id}`, { error: error.message });
        // Continue with next user even if one fails
      }
    }

    logStep(`Daily check completed`, { 
      totalChecked: profiles?.length || 0,
      suspended: suspendedCount 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: profiles?.length || 0,
        suspended: suspendedCount 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
