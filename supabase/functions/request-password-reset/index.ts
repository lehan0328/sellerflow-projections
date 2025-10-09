import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();
    console.log("Password reset requested for:", email);

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Find user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const user = users?.find(u => u.email === email);

    if (!user) {
      console.log("Email not found");
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate secure random token
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: token,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('Token creation error:', tokenError);
      throw new Error('Failed to create reset token');
    }

    // Send branded email with reset link
    const resetUrl = `${req.headers.get('origin') || 'https://aurenapp.com'}/auth?token=${token}`;
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Auren <noreply@aurenapp.com>",
        to: [email],
        subject: "Reset Your Auren Password",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 40px;">
                <img src="https://ruvdqtqyfzaxlobmxgaj.supabase.co/storage/v1/object/public/assets/auren-icon-blue.png" alt="Auren" style="width: 64px; height: 64px; margin-bottom: 16px;" />
                <h1 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: bold;">Auren</h1>
              </div>

              <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <h2 style="margin: 0 0 24px 0; color: #1e293b; font-size: 24px; font-weight: bold;">Reset Your Password</h2>
                
                <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6;">
                  We received a request to reset your password for your Auren account. Click the button below to create a new password.
                </p>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" 
                     style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Reset Password
                  </a>
                </div>

                <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="margin: 8px 0 0 0; color: #3b82f6; font-size: 14px; word-break: break-all;">
                  ${resetUrl}
                </p>

                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                    This link will expire in 24 hours. If you didn't request this password reset, you can safely ignore this email.
                  </p>
                </div>
              </div>

              <div style="text-align: center; margin-top: 40px;">
                <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                  © 2024 Auren. All rights reserved.
                </p>
                <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px;">
                  This email was sent to ${email}
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    console.log("Password reset email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in request-password-reset:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
