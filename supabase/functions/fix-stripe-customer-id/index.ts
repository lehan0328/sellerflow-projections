import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc('is_website_admin');
    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    const { userId, customerId, action, reason } = await req.json();

    if (!userId || !action) {
      throw new Error("userId and action are required");
    }

    if (!['update', 'clear', 'create'].includes(action)) {
      throw new Error("Invalid action. Must be 'update', 'clear', or 'create'");
    }

    console.log(`[FIX] ${action} customer ID for user ${userId}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_id, email, stripe_customer_id, first_name, last_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    const oldCustomerId = profile.stripe_customer_id;
    let newCustomerId: string | null = null;
    let actionResult = '';

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    if (action === 'update') {
      if (!customerId) {
        throw new Error("customerId is required for update action");
      }

      // Validate customer exists in Stripe
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) {
          throw new Error("Customer is deleted in Stripe");
        }
        newCustomerId = customer.id;
        actionResult = `Updated to ${customerId}`;
      } catch (error: any) {
        throw new Error(`Invalid customer ID: ${error.message}`);
      }
    } else if (action === 'clear') {
      newCustomerId = null;
      actionResult = 'Cleared customer ID';
    } else if (action === 'create') {
      // Create new customer in Stripe
      if (!profile.email) {
        throw new Error("User has no email address");
      }

      const customer = await stripe.customers.create({
        email: profile.email,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || undefined,
        metadata: {
          user_id: userId,
        },
      });

      newCustomerId = customer.id;
      actionResult = `Created new customer ${customer.id}`;
    }

    // Update database
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ stripe_customer_id: newCustomerId })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Failed to update database: ${updateError.message}`);
    }

    // Log the change
    await supabaseClient
      .from('stripe_customer_audit_log')
      .insert({
        user_id: userId,
        action: action,
        old_customer_id: oldCustomerId,
        new_customer_id: newCustomerId,
        performed_by: user.id,
        reason: reason || actionResult,
        metadata: {
          email: profile.email,
          timestamp: new Date().toISOString(),
        },
      });

    console.log(`[FIX] Success: ${actionResult} for ${profile.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        oldCustomerId,
        newCustomerId,
        action,
        result: actionResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[FIX] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});