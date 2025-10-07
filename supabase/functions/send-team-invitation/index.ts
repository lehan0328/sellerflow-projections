import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";

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

    const { email, role } = await req.json();

    // Get user's account and verify admin rights
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("account_id, max_team_members")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("account_id", profile.account_id)
      .single();

    if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
      throw new Error("Only admins can send invitations");
    }

    // Check team member limit
    const { count: currentMembers } = await supabaseClient
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("account_id", profile.account_id);

    if (currentMembers && currentMembers >= profile.max_team_members) {
      throw new Error("Team member limit reached. Please upgrade your plan or purchase additional seats.");
    }

    // Check if user already exists in the account
    const { data: existingUser } = await supabaseClient
      .from("profiles")
      .select("user_id, account_id")
      .eq("email", email)
      .single();

    if (existingUser && existingUser.account_id === profile.account_id) {
      throw new Error("User is already a member of this team");
    }

    // Generate invitation token
    const token_string = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const { error: inviteError } = await supabaseClient
      .from("team_invitations")
      .insert({
        account_id: profile.account_id,
        email,
        role: role || 'staff',
        token: token_string,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      });

    if (inviteError) {
      throw inviteError;
    }

    // Send invitation email via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const inviteUrl = `${origin}/auth?invite=${token_string}`;

    await resend.emails.send({
      from: "Auren <onboarding@resend.dev>",
      to: [email],
      subject: "You've been invited to join a team on Auren",
      html: `
        <h1>Team Invitation</h1>
        <p>You've been invited to join a team on Auren as a ${role || 'staff'} member.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Accept Invitation</a>
        <p>This invitation will expire in 7 days.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      `,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Invitation sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
