import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      throw new Error("Stripe webhook secret not configured");
    }

    // Verify the webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    console.log("Received Stripe event:", event.type);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle checkout session completion failures
    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email || session.customer_details?.email;

      console.log("Checkout payment failed for:", customerEmail);
      
      // Payment declined during upgrade - subscription should NOT be created
      // Stripe automatically handles this, but we log it for monitoring
      if (customerEmail) {
        const { data: user } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = user?.users.find(u => u.email === customerEmail);
        
        if (targetUser) {
          // Log the failed attempt
          await supabaseAdmin
            .from('support_tickets')
            .insert({
              user_id: targetUser.id,
              subject: 'Payment Failed During Upgrade',
              message: `Payment was declined during checkout. No changes were made to your subscription. Please update your payment method and try again.`,
              category: 'Billing',
              status: 'open',
              priority: 'high'
            });
          
          console.log("Created support ticket for failed payment:", targetUser.id);
        }
      }
    }

    // Handle payment failed events for existing subscriptions
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerEmail = invoice.customer_email;

      if (customerEmail) {
        // Check if subscription is already terminated
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
            console.log("Skipping payment failed processing - subscription already terminated:", subscription.id);
            return new Response(JSON.stringify({ received: true, skipped: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
        }

        console.log("Payment failed for customer:", customerEmail);

        // Find user by email and suspend account
        const { data: user } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = user?.users.find(u => u.email === customerEmail);

        if (targetUser) {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              account_status: 'suspended_payment',
              payment_failure_date: new Date().toISOString()
            })
            .eq('user_id', targetUser.id);

          if (error) {
            console.error("Error suspending account:", error);
          } else {
            console.log("Account suspended for user:", targetUser.id);
          }
        }
      }
    }

    // Handle payment succeeded events (reactivate account)
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerEmail = invoice.customer_email;

      if (customerEmail) {
        console.log("Payment succeeded for customer:", customerEmail);

        // Find user by email and activate account
        const { data: user } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = user?.users.find(u => u.email === customerEmail);

        if (targetUser) {
          // Check if user has referred_user_discount that hasn't been redeemed
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('plan_override, discount_redeemed_at')
            .eq('user_id', targetUser.id)
            .single();

          const updateData: any = {
            account_status: 'active',
            payment_failure_date: null
          };

          // If user had referred_user_discount and hasn't redeemed it yet, mark as redeemed
          if (profile?.plan_override === 'referred_user_discount' && !profile?.discount_redeemed_at) {
            updateData.discount_redeemed_at = new Date().toISOString();
            updateData.plan_override = null;
            console.log("Marking referred user discount as redeemed for:", targetUser.id);
          }

          const { error } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('user_id', targetUser.id);

          if (error) {
            console.error("Error activating account:", error);
          } else {
            console.log("Account activated for user:", targetUser.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
