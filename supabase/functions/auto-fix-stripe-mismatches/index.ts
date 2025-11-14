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

    const { dryRun = false } = await req.json();

    console.log(`[AUTO-FIX] Starting auto-fix (dry-run: ${dryRun})...`);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, email, stripe_customer_id, first_name, last_name')
      .order('created_at', { ascending: false });

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    const fixes: Array<{
      userId: string;
      email: string;
      action: string;
      oldCustomerId: string | null;
      newCustomerId: string | null;
      reason: string;
    }> = [];

    const errors: Array<{
      userId: string;
      email: string;
      error: string;
    }> = [];

    let fixedCount = 0;
    let skippedCount = 0;

    // Process each profile
    for (const profile of profiles || []) {
      try {
        if (!profile.email) {
          skippedCount++;
          continue;
        }

        let shouldFix = false;
        let fixAction: 'update' | 'clear' | 'create' | null = null;
        let newCustomerId: string | null = null;
        let reason = '';

        // If profile has a customer ID, verify it
        if (profile.stripe_customer_id) {
          try {
            const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
            
            if (customer.deleted) {
              // Customer deleted, clear the ID
              shouldFix = true;
              fixAction = 'clear';
              reason = 'Customer deleted in Stripe';
            }
            // Customer exists and is valid, no fix needed
          } catch (stripeError: any) {
            if (stripeError.code === 'resource_missing') {
              // Customer doesn't exist, try to find by email
              const customersByEmail = await stripe.customers.list({
                email: profile.email,
                limit: 2,
              });

              if (customersByEmail.data.length === 1) {
                // Found exact match, update ID
                shouldFix = true;
                fixAction = 'update';
                newCustomerId = customersByEmail.data[0].id;
                reason = `Updated from invalid ID "${profile.stripe_customer_id}" to valid ID "${newCustomerId}"`;
              } else if (customersByEmail.data.length === 0) {
                // No customer found, clear invalid ID
                shouldFix = true;
                fixAction = 'clear';
                reason = `Cleared invalid customer ID "${profile.stripe_customer_id}"`;
              } else {
                // Multiple customers, skip (requires manual review)
                skippedCount++;
                errors.push({
                  userId: profile.user_id,
                  email: profile.email,
                  error: 'Multiple Stripe customers found, manual review required',
                });
                continue;
              }
            }
          }
        } else {
          // No customer ID, search by email
          const customersByEmail = await stripe.customers.list({
            email: profile.email,
            limit: 2,
          });

          if (customersByEmail.data.length === 1) {
            // Found match, add customer ID
            shouldFix = true;
            fixAction = 'update';
            newCustomerId = customersByEmail.data[0].id;
            reason = `Added missing customer ID "${newCustomerId}"`;
          }
          // If 0 or multiple, skip (don't auto-create customers)
        }

        // Apply fix
        if (shouldFix && fixAction) {
          if (!dryRun) {
            // Update database
            const updateData: { stripe_customer_id: string | null } = {
              stripe_customer_id: fixAction === 'clear' ? null : newCustomerId,
            };

            const { error: updateError } = await supabaseClient
              .from('profiles')
              .update(updateData)
              .eq('user_id', profile.user_id);

            if (updateError) {
              throw new Error(`Failed to update: ${updateError.message}`);
            }

            // Log the fix
            await supabaseClient
              .from('stripe_customer_audit_log')
              .insert({
                user_id: profile.user_id,
                action: 'auto_fix',
                old_customer_id: profile.stripe_customer_id,
                new_customer_id: newCustomerId,
                performed_by: user.id,
                reason: reason,
                metadata: {
                  email: profile.email,
                  fixAction: fixAction,
                  dryRun: false,
                },
              });
          }

          fixes.push({
            userId: profile.user_id,
            email: profile.email,
            action: fixAction,
            oldCustomerId: profile.stripe_customer_id,
            newCustomerId: newCustomerId,
            reason: reason,
          });

          fixedCount++;
        }
      } catch (error: any) {
        console.error(`[AUTO-FIX] Error processing ${profile.email}:`, error.message);
        errors.push({
          userId: profile.user_id,
          email: profile.email,
          error: error.message,
        });
      }
    }

    console.log(`[AUTO-FIX] Completed: ${fixedCount} fixed, ${skippedCount} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        summary: {
          totalProfiles: profiles?.length || 0,
          fixed: fixedCount,
          skipped: skippedCount,
          errors: errors.length,
        },
        fixes,
        errors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[AUTO-FIX] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});