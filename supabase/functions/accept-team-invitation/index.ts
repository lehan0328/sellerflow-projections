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
      { auth: { persistSession: false } }
    );

    console.log("[ACCEPT-INVITATION] Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error("[ACCEPT-INVITATION] Unauthorized:", userError);
      throw new Error("Unauthorized");
    }

    console.log("[ACCEPT-INVITATION] User authenticated:", user.email);

    const { inviteToken } = await req.json();
    console.log("[ACCEPT-INVITATION] Processing invite token");

    // Find invitation
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("team_invitations")
      .select("*")
      .eq("token", inviteToken)
      .single();

    if (inviteError) {
      console.error("[ACCEPT-INVITATION] Invitation lookup error:", inviteError);
      // If error code is PGRST116, it means no rows found (invitation was deleted or never existed)
      if (inviteError.code === 'PGRST116') {
        throw new Error("This invitation is no longer valid. It may have been cancelled by the administrator.");
      }
      throw new Error("Invalid invitation token");
    }

    if (!invitation) {
      console.error("[ACCEPT-INVITATION] Invitation not found");
      throw new Error("This invitation is no longer valid. It may have been cancelled by the administrator.");
    }

    console.log("[ACCEPT-INVITATION] Invitation found for:", invitation.email);

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.error("[ACCEPT-INVITATION] Invitation has expired:", invitation.expires_at);
      throw new Error("This invitation has expired. Please ask your administrator to send a new invitation.");
    }

    // Check if invitation has already been accepted
    if (invitation.accepted_at) {
      console.error("[ACCEPT-INVITATION] Invitation already accepted:", invitation.accepted_at);
      throw new Error("This invitation has already been used.");
    }

    // Check if email matches
    if (invitation.email !== user.email) {
      console.error("[ACCEPT-INVITATION] Email mismatch - Invitation:", invitation.email, "User:", user.email);
      throw new Error("This invitation was sent to a different email address. Please sign in with the invited email or request a new invitation.");
    }

    console.log("[ACCEPT-INVITATION] All validation checks passed");

    console.log("[ACCEPT-INVITATION] Updating user profile to join account:", invitation.account_id);

    // Update user's profile to join the account
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({ 
        account_id: invitation.account_id,
        is_account_owner: false 
      })
      .eq("user_id", user.id);

    if (profileError) {
      console.error("[ACCEPT-INVITATION] Profile update error:", profileError);
      throw profileError;
    }

    console.log("[ACCEPT-INVITATION] Creating user role:", invitation.role);

    // Create user role
    const { error: roleError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: user.id,
        account_id: invitation.account_id,
        role: invitation.role,
      });

    if (roleError) {
      console.error("[ACCEPT-INVITATION] Role creation error:", roleError);
      throw roleError;
    }

    console.log("[ACCEPT-INVITATION] Marking invitation as accepted");

    // Mark invitation as accepted
    const { error: updateError } = await supabaseClient
      .from("team_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("[ACCEPT-INVITATION] Invitation update error:", updateError);
      throw updateError;
    }

    console.log("[ACCEPT-INVITATION] Successfully completed invitation acceptance");

    return new Response(
      JSON.stringify({ success: true, message: "Successfully joined team", role: invitation.role }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[ACCEPT-INVITATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
