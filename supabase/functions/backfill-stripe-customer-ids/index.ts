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

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roles) throw new Error("Admin access required");

    console.log("Starting backfill of Stripe customer IDs");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get all users directly from auth.users using service role
    const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to fetch users: ${authError.message}`);
    }

    const userEmails: Record<string, string> = {};
    authUsers.users.forEach(user => {
      if (user.email) {
        userEmails[user.id] = user.email;
      }
    });
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each user
    for (const [userId, email] of Object.entries(userEmails)) {
      try {
        // Check if already has stripe_customer_id
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('stripe_customer_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile?.stripe_customer_id) {
          console.log(`Skipping ${email} - already has customer ID`);
          skipped++;
          continue;
        }

        // Look up customer in Stripe
        const customers = await stripe.customers.list({ email: email as string, limit: 1 });
        
        if (customers.data.length > 0) {
          const customerId = customers.data[0].id;
          
          // Update profile with stripe_customer_id
          const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ stripe_customer_id: customerId })
            .eq('user_id', userId);

          if (updateError) {
            console.error(`Error updating ${email}:`, updateError);
            errors++;
          } else {
            console.log(`Updated ${email} with customer ID ${customerId}`);
            updated++;
          }
        } else {
          console.log(`No Stripe customer found for ${email}`);
          skipped++;
        }
      } catch (error) {
        console.error(`Error processing ${email}:`, error);
        errors++;
      }
    }

    console.log("Backfill complete", { updated, skipped, errors });

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        skipped,
        errors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Backfill error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});