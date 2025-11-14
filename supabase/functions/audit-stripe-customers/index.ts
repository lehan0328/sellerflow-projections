import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuditResult {
  userId: string;
  email: string;
  dbCustomerId: string | null;
  stripeCustomerId: string | null;
  stripeEmail: string | null;
  status: 'valid' | 'invalid' | 'mismatch' | 'not_found' | 'multiple';
  canAutoFix: boolean;
  suggestedFix: string | null;
}

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

    console.log("[AUDIT] Starting Stripe customer audit...");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Fetch all profiles with user details
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, email, stripe_customer_id, first_name, last_name')
      .order('created_at', { ascending: false });

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    console.log(`[AUDIT] Found ${profiles?.length || 0} profiles to audit`);

    const auditResults: AuditResult[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let mismatchCount = 0;
    let notFoundCount = 0;

    // Process each profile
    for (const profile of profiles || []) {
      const result: AuditResult = {
        userId: profile.user_id,
        email: profile.email || 'No email',
        dbCustomerId: profile.stripe_customer_id,
        stripeCustomerId: null,
        stripeEmail: null,
        status: 'not_found',
        canAutoFix: false,
        suggestedFix: null,
      };

      // Skip if no email
      if (!profile.email) {
        result.status = 'not_found';
        result.suggestedFix = 'No email address in profile';
        auditResults.push(result);
        notFoundCount++;
        continue;
      }

      try {
        // If profile has a customer ID, verify it exists in Stripe
        if (profile.stripe_customer_id) {
          try {
            const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
            
            if (customer.deleted) {
              result.status = 'invalid';
              result.suggestedFix = 'Customer deleted in Stripe. Clear customer ID.';
              result.canAutoFix = true;
              invalidCount++;
            } else {
              result.stripeCustomerId = customer.id;
              result.stripeEmail = customer.email || null;

              // Check if emails match
              if (customer.email?.toLowerCase() === profile.email.toLowerCase()) {
                result.status = 'valid';
                validCount++;
              } else {
                result.status = 'mismatch';
                result.suggestedFix = `Email mismatch: DB has "${profile.email}", Stripe has "${customer.email}"`;
                mismatchCount++;
              }
            }
          } catch (stripeError: any) {
            // Customer ID doesn't exist in Stripe
            if (stripeError.code === 'resource_missing') {
              result.status = 'invalid';
              
              // Try to find customer by email
              const customersByEmail = await stripe.customers.list({
                email: profile.email,
                limit: 2,
              });

              if (customersByEmail.data.length === 1) {
                result.stripeCustomerId = customersByEmail.data[0].id;
                result.stripeEmail = customersByEmail.data[0].email || null;
                result.suggestedFix = `Update customer ID from "${profile.stripe_customer_id}" to "${customersByEmail.data[0].id}"`;
                result.canAutoFix = true;
              } else if (customersByEmail.data.length > 1) {
                result.status = 'multiple';
                result.suggestedFix = `Multiple Stripe customers found with email "${profile.email}". Manual review required.`;
              } else {
                result.suggestedFix = `Customer ID "${profile.stripe_customer_id}" not found in Stripe. Create new customer or clear ID.`;
                result.canAutoFix = true;
              }
              invalidCount++;
            } else {
              throw stripeError;
            }
          }
        } else {
          // No customer ID in database, search Stripe by email
          const customersByEmail = await stripe.customers.list({
            email: profile.email,
            limit: 2,
          });

          if (customersByEmail.data.length === 1) {
            result.stripeCustomerId = customersByEmail.data[0].id;
            result.stripeEmail = customersByEmail.data[0].email || null;
            result.status = 'mismatch';
            result.suggestedFix = `Customer exists in Stripe. Update database with customer ID "${customersByEmail.data[0].id}"`;
            result.canAutoFix = true;
            mismatchCount++;
          } else if (customersByEmail.data.length > 1) {
            result.status = 'multiple';
            result.suggestedFix = `Multiple Stripe customers found with email "${profile.email}". Manual review required.`;
            notFoundCount++;
          } else {
            result.status = 'not_found';
            result.suggestedFix = 'No Stripe customer found. Can create new customer if needed.';
            result.canAutoFix = true;
            notFoundCount++;
          }
        }
      } catch (error: any) {
        console.error(`[AUDIT] Error processing ${profile.email}:`, error.message);
        result.status = 'invalid';
        result.suggestedFix = `Error: ${error.message}`;
      }

      auditResults.push(result);
    }

    // Log audit in database
    await supabaseClient
      .from('stripe_customer_audit_log')
      .insert({
        action: 'audit',
        performed_by: user.id,
        reason: 'Full system audit',
        metadata: {
          totalProfiles: profiles?.length || 0,
          validCount,
          invalidCount,
          mismatchCount,
          notFoundCount,
        },
      });

    console.log(`[AUDIT] Completed: ${validCount} valid, ${invalidCount} invalid, ${mismatchCount} mismatches, ${notFoundCount} not found`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalProfiles: profiles?.length || 0,
          validCustomers: validCount,
          invalidCustomers: invalidCount,
          mismatches: mismatchCount,
          notFound: notFoundCount,
          timestamp: new Date().toISOString(),
        },
        results: auditResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[AUDIT] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});