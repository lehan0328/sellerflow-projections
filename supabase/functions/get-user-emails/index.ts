import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate the requesting user - website admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw userError;

    // Check if user is the website admin
    const WEBSITE_ADMIN_EMAIL = 'chuandy914@gmail.com';
    if (userData.user.email !== WEBSITE_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userIds } = await req.json();

    // Get user emails and last sign-in from auth.users
    const emailMap: Record<string, string> = {};
    const lastSignInMap: Record<string, string> = {};
    
    for (const userId of userIds) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUser?.user) {
        if (authUser.user.email) {
          emailMap[userId] = authUser.user.email;
        }
        if (authUser.user.last_sign_in_at) {
          lastSignInMap[userId] = authUser.user.last_sign_in_at;
        }
      }
    }

    return new Response(JSON.stringify({ emails: emailMap, lastSignIn: lastSignInMap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
