import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";

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

    // Send invitation email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const signupUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/admin/signup?token=${invitationToken}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #5568d3; }
            .info-box { background: #f9fafb; border-left: 4px solid #667eea; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Welcome to Auren Admin</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px;">Hello,</p>
              <p>You've been invited to join the Auren Admin Dashboard with <strong>${role}</strong> access by ${user.email}.</p>
              
              <div class="info-box">
                <strong>Your Access Level:</strong> ${role === 'admin' ? 'Full Admin Access' : 'Support & Features Staff Access'}
              </div>

              <p>To complete your registration and create your password, click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${signupUrl}" class="button">Create Your Admin Account</a>
              </div>

              <p style="font-size: 14px; color: #6b7280;">Or copy and paste this link into your browser:</p>
              <p style="font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">${signupUrl}</p>

              <p style="margin-top: 30px;"><strong>Important:</strong></p>
              <ul style="color: #6b7280; font-size: 14px;">
                <li>This invitation expires in 7 days</li>
                <li>Your email is pre-set and cannot be changed: <strong>${email}</strong></li>
                <li>You'll create your own secure password during signup</li>
                <li>This is for admin dashboard access only</li>
              </ul>
            </div>
            <div class="footer">
              <p>This is an automated invitation from Auren Admin Dashboard</p>
              <p>If you didn't expect this invitation, please contact the administrator</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "Auren Admin <noreply@aurenapp.com>",
      to: [email],
      subject: `You're invited to Auren Admin Dashboard (${role})`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("[INVITE_ADMIN] Email error:", emailError);
      throw new Error(`Failed to send invitation email: ${emailError.message}`);
    }

    console.log(`[INVITE_ADMIN] Successfully invited ${email} as ${role} - Email sent`);

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