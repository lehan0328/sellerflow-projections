import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    );

    // Get the user from the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unable to authenticate user");
    }

    console.log('🔧 Restoring admin access for user:', user.id);

    // Get user's account_id
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.account_id) {
      throw new Error("Account not found");
    }

    // Ensure user has both owner and admin roles
    const rolesToEnsure = ['owner', 'admin'];
    const results = [];

    for (const role of rolesToEnsure) {
      const { data, error } = await supabaseClient
        .from('user_roles')
        .upsert({
          user_id: user.id,
          account_id: profile.account_id,
          role: role
        }, {
          onConflict: 'user_id,account_id,role'
        })
        .select();

      if (error) {
        console.error(`Failed to ensure ${role} role:`, error);
        results.push({ role, success: false, error: error.message });
      } else {
        console.log(`✅ Ensured ${role} role`);
        results.push({ role, success: true });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin access restored",
        roles: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error restoring admin access:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});