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

    const { token, password, name } = await req.json();

    if (!token || !password || !name) {
      throw new Error("Token, password, and name are required");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    console.log(`[ADMIN_SIGNUP] Processing signup for token: ${token.substring(0, 8)}...`);

    // Verify invitation token
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('admin_permissions')
      .select('*')
      .eq('invitation_token', token)
      .single();

    if (inviteError || !invitation) {
      throw new Error("Invalid invitation token");
    }

    // Check if token expired
    if (new Date(invitation.token_expires_at) < new Date()) {
      throw new Error("Invitation token has expired");
    }

    // Check if account already created
    if (invitation.account_created) {
      throw new Error("This invitation has already been used");
    }

    console.log(`[ADMIN_SIGNUP] Valid invitation for: ${invitation.email}`);

    // Create user account
    const { data: userData, error: createError } = await supabaseClient.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true, // Auto-confirm email for admin users
    });

    if (createError) {
      console.error("[ADMIN_SIGNUP] User creation error:", createError);
      throw new Error(`Failed to create account: ${createError.message}`);
    }

    console.log(`[ADMIN_SIGNUP] User created: ${userData.user.id}`);

    // Mark invitation as used and store the name
    const { error: updateError } = await supabaseClient
      .from('admin_permissions')
      .update({ 
        account_created: true,
        first_name: name,
        invitation_token: null, // Clear token after use
        updated_at: new Date().toISOString()
      })
      .eq('email', invitation.email);

    if (updateError) {
      console.error("[ADMIN_SIGNUP] Failed to update invitation:", updateError);
    }

    console.log(`[ADMIN_SIGNUP] Signup complete for ${invitation.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account created successfully",
        email: invitation.email,
        role: invitation.role
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("[ADMIN_SIGNUP] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});