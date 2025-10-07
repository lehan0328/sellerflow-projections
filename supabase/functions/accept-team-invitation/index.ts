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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { inviteToken } = await req.json();

    // Find invitation
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("team_invitations")
      .select("*")
      .eq("token", inviteToken)
      .single();

    if (inviteError || !invitation) {
      throw new Error("Invalid invitation token");
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error("Invitation has expired");
    }

    // Check if invitation has already been accepted
    if (invitation.accepted_at) {
      throw new Error("Invitation has already been accepted");
    }

    // Check if email matches
    if (invitation.email !== user.email) {
      throw new Error("This invitation was sent to a different email address");
    }

    // Update user's profile to join the account
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({ 
        account_id: invitation.account_id,
        is_account_owner: false 
      })
      .eq("user_id", user.id);

    if (profileError) {
      throw profileError;
    }

    // Create user role
    const { error: roleError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: user.id,
        account_id: invitation.account_id,
        role: invitation.role,
      });

    if (roleError) {
      throw roleError;
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabaseClient
      .from("team_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Successfully joined team", role: invitation.role }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
