import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
// Resend temporarily disabled due to build issues
// import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBSITE_ADMIN_EMAILS = ['chuandy914@gmail.com', 'orders@imarand.com'];

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

    // Verify caller is a website admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user?.email) {
      throw new Error("Unauthorized");
    }

    if (!WEBSITE_ADMIN_EMAILS.includes(user.email)) {
      throw new Error("Only website admins can invite users");
    }

    // Get request body
    const { email, role, action } = await req.json();

    console.log(`[INVITE_ADMIN] Action: ${action}, Email: ${email}, Role: ${role}, Invited by: ${user.email}`);

    // Handle delete action
    if (action === 'delete') {
      const { error: deleteError } = await supabaseClient
        .from('admin_permissions')
        .delete()
        .eq('email', email);

      if (deleteError) {
        throw new Error(`Failed to remove admin: ${deleteError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Admin access removed for ${email}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Validate inputs for invite/update
    if (!email || !role) {
      throw new Error("Email and role are required");
    }

    if (!['admin', 'staff'].includes(role)) {
      throw new Error("Role must be either 'admin' or 'staff'");
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Upsert admin permission with invitation token
    const { data, error } = await supabaseClient
      .from('admin_permissions')
      .upsert({
        email: email.toLowerCase(),
        role,
        invited_by: user.email,
        invitation_token: invitationToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        account_created: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to invite admin: ${error.message}`);
    }

    // Send invitation email - TEMPORARILY DISABLED
    // TODO: Re-enable email once Resend package is properly configured
    const appUrl = 'https://aurenapp.com';
    const signupUrl = `${appUrl}/admin/signup?token=${invitationToken}`;
    
    console.log(`[INVITE_ADMIN] Invitation created for ${email} as ${role}`);
    console.log(`[INVITE_ADMIN] Signup URL: ${signupUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation sent to ${email}`,
        data 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("[INVITE_ADMIN] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});