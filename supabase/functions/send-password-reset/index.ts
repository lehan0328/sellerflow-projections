import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const resendApiKey = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  resetUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetUrl }: PasswordResetRequest = await req.json();

    console.log("Sending password reset email to:", email);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Auren <noreply@imarand.com>",
        to: [email],
        subject: "Reset Your CashFlow Pro Password",
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
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 40px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: linear-gradient(135deg, #1e40af, #3b82f6); border-radius: 12px; margin-bottom: 16px;">
                  <span style="color: white; font-size: 24px; font-weight: bold;">$</span>
                </div>
                <h1 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: bold;">CashFlow Pro</h1>
              </div>

              <!-- Main Content -->
              <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <h2 style="margin: 0 0 24px 0; color: #1e293b; font-size: 24px; font-weight: bold;">Reset Your Password</h2>
                
                <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6;">
                  We received a request to reset your password for your CashFlow Pro account. Click the button below to create a new password.
                </p>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" 
                     style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Reset Password
                  </a>
                </div>

                <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                  If the button doesn't work, you can copy and paste this link into your browser:
                </p>
                <p style="margin: 8px 0 0 0; color: #3b82f6; font-size: 14px; word-break: break-all;">
                  ${resetUrl}
                </p>

                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                    This password reset link will expire in 24 hours. If you didn't request this password reset, you can safely ignore this email.
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="text-align: center; margin-top: 40px;">
                <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                  © 2024 CashFlow Pro. All rights reserved.
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

    const responseData = await emailResponse.json();

    console.log("Password reset email sent successfully:", responseData);

    return new Response(JSON.stringify({ success: true, emailResponse: responseData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);