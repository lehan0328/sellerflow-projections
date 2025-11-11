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
    const signupUrl = `https://aurenapp.com/admin/signup?token=${invitationToken}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; 
              line-height: 1.6; 
              color: #1f2937; 
              background-color: #f9fafb;
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 40px 20px; 
            }
            .email-card {
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #3fa9d9 0%, #2b7fa6 100%);
              color: white; 
              padding: 40px 30px; 
              text-align: center; 
            }
            .logo {
              max-width: 180px;
              height: auto;
              margin-bottom: 20px;
            }
            .content { 
              background: #ffffff; 
              padding: 40px 30px;
            }
            .button { 
              display: inline-block; 
              background: #3fa9d9; 
              color: white !important; 
              padding: 16px 40px; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: 600; 
              margin: 24px 0;
              transition: background 0.3s ease;
            }
            .button:hover { 
              background: #2b7fa6; 
            }
            .info-box { 
              background: #eff6ff; 
              border-left: 4px solid #3fa9d9; 
              padding: 20px; 
              margin: 24px 0; 
              border-radius: 6px; 
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              padding: 20px;
              color: #6b7280; 
              font-size: 13px; 
              border-top: 1px solid #e5e7eb;
            }
            .link-box {
              background: #f9fafb;
              padding: 12px;
              border-radius: 6px;
              word-break: break-all;
              font-size: 12px;
              color: #6b7280;
              border: 1px solid #e5e7eb;
            }
            ul {
              padding-left: 20px;
              color: #4b5563;
            }
            ul li {
              margin: 8px 0;
            }
            strong {
              color: #1f2937;
            }
            .role-badge {
              display: inline-block;
              background: #3fa9d9;
              color: white;
              padding: 6px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin: 8px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="email-card">
              <div class="header">
                <img src="https://aurenapp.com/auren-full-logo.png" alt="Auren Logo" class="logo" />
                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Admin Dashboard Invitation</h1>
              </div>
              <div class="content">
                <p style="font-size: 16px; margin-top: 0;">Hello,</p>
                <p style="font-size: 15px;">You've been invited to join the <strong>Auren Admin Dashboard</strong> by ${user.email}.</p>
                
                <div class="info-box">
                  <div style="margin-bottom: 8px;"><strong>Your Access Level:</strong></div>
                  <span class="role-badge">${role === 'admin' ? 'Full Admin Access' : 'Support & Features Staff Access'}</span>
                  <p style="margin: 12px 0 0 0; font-size: 14px; color: #4b5563;">
                    ${role === 'admin' 
                      ? 'You will have full access to all admin features, settings, and user management.' 
                      : 'You will have access to support tickets and feature requests management.'}
                  </p>
                </div>

                <p style="font-size: 15px;">To complete your registration and create your password, click the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${signupUrl}" class="button">Create Your Admin Account →</a>
                </div>

                <p style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">Or copy and paste this link into your browser:</p>
                <div class="link-box">${signupUrl}</div>

                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 12px 0;"><strong>Important Information:</strong></p>
                  <ul style="font-size: 14px; margin: 0;">
                    <li>This invitation link expires in <strong>7 days</strong></li>
                    <li>Your email address is pre-set: <strong>${email}</strong></li>
                    <li>You will create your own secure password during signup</li>
                    <li>This is for admin dashboard access only, separate from customer accounts</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #3fa9d9;">Auren Cash Flow Management</p>
                <p style="margin: 0;">This is an automated invitation. If you didn't expect this, please contact the administrator.</p>
              </div>
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