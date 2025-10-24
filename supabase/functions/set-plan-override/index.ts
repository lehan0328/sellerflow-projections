import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBSITE_ADMIN_EMAIL = 'chuandy914@gmail.com';

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

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !caller) {
      throw new Error("Authentication failed");
    }

    // Verify caller is website admin
    if (caller.email !== WEBSITE_ADMIN_EMAIL) {
      throw new Error("Unauthorized - Admin access required");
    }

    const { userEmail, planTier, reason } = await req.json();

    if (!userEmail || !planTier) {
      throw new Error("userEmail and planTier are required");
    }

    // Valid plan tiers
    const validPlans = ['starter', 'growing', 'professional', 'enterprise'];
    if (!validPlans.includes(planTier)) {
      throw new Error(`Invalid plan tier. Must be one of: ${validPlans.join(', ')}`);
    }

    // Find user by email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
    if (userError) throw userError;

    const targetUser = userData.users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());
    if (!targetUser) {
      throw new Error(`User not found: ${userEmail}`);
    }

    // Update profile with plan override
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        plan_override: planTier,
        plan_override_reason: reason || `Plan override set by admin to ${planTier}`,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', targetUser.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully set ${userEmail} to ${planTier} plan`,
        userId: targetUser.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error setting plan override:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});