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

    // Get company/inviter information
    const { data: inviterProfile } = await supabaseClient
      .from("profiles")
      .select("first_name, last_name, company")
      .eq("user_id", user.id)
      .single();

    const companyName = inviterProfile?.company || "the team";
    const inviterName = inviterProfile ? `${inviterProfile.first_name} ${inviterProfile.last_name}` : "A team member";

    // Send invitation email via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const inviteUrl = `${origin}/auth?invite=${token_string}`;

    await resend.emails.send({
      from: "Auren <noreply@auren.app>",
      to: [email],
      subject: `You've been invited to join ${companyName} on Auren`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px;">
                        <h1 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                          You've been invited!
                        </h1>
                        <p style="margin: 0 0 16px 0; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                          ${inviterName} has invited you to join <strong>${companyName}</strong> on Auren as a <strong>${role || 'staff'}</strong> member.
                        </p>
                        <p style="margin: 0 0 24px 0; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                          Auren is a powerful cash flow management platform that helps teams manage their finances, forecast payouts, and make better business decisions.
                        </p>
                        <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                          <tr>
                            <td style="border-radius: 6px; background-color: #2563eb;">
                              <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; color: white; text-decoration: none; font-size: 16px; font-weight: 500;">
                                Accept Invitation
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                          This invitation will expire in 7 days.
                        </p>
                        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                          If you didn't expect this invitation, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                        <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                          © ${new Date().getFullYear()} Auren. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
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
