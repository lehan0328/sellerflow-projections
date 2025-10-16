import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const resendApiKey = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeatureRequestEmail {
  name: string;
  email: string;
  subject: string;
  message: string;
  priority: string;
  category: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { name, email, subject, message, priority, category }: FeatureRequestEmail = await req.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user } } = await supabaseClient.auth.getUser();

    // Save feature request to database
    const { error: dbError } = await supabaseClient
      .from('feature_requests')
      .insert({
        user_id: user?.id,
        name,
        email,
        subject,
        message,
        priority: priority || 'medium',
        category: category || 'feature',
        status: 'open'
      });

    if (dbError) {
      console.error("Database error:", dbError);
      // Continue with email even if database save fails
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Feature Request <onboarding@resend.dev>",
        to: ["orders@imarand.com"],
        reply_to: email,
        subject: `[${category}] ${subject} - Priority: ${priority}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Feature Request</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 40px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: linear-gradient(135deg, #1e40af, #3b82f6); border-radius: 12px; margin-bottom: 16px;">
                  <span style="color: white; font-size: 24px; font-weight: bold;">💡</span>
                </div>
                <h1 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: bold;">New Feature Request</h1>
              </div>

              <!-- Main Content -->
              <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #555; margin: 0 0 16px 0; font-size: 18px;">Request Details</h2>
                  <p style="margin: 8px 0; color: #333;"><strong>Subject:</strong> ${subject}</p>
                  <p style="margin: 8px 0; color: #333;"><strong>Category:</strong> <span style="text-transform: capitalize;">${category}</span></p>
                  <p style="margin: 8px 0; color: #333;"><strong>Priority:</strong> <span style="text-transform: capitalize; ${priority === 'high' ? 'color: #dc2626;' : priority === 'medium' ? 'color: #d97706;' : 'color: #16a34a;'}">${priority}</span></p>
                </div>

                <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #555; margin: 0 0 16px 0; font-size: 18px;">Submitted By</h2>
                  <p style="margin: 8px 0; color: #333;"><strong>Name:</strong> ${name}</p>
                  <p style="margin: 8px 0; color: #333;"><strong>Email:</strong> ${email}</p>
                </div>

                <div style="margin: 20px 0;">
                  <h2 style="color: #555; margin: 0 0 16px 0; font-size: 18px;">Message</h2>
                  <div style="background-color: #ffffff; padding: 20px; border: 2px solid #e0e0e0; border-radius: 8px; white-space: pre-wrap; line-height: 1.6; color: #333;">${message}</div>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
                  <p style="margin: 0;">This feature request was submitted through the CashFlow Pro application settings panel.</p>
                  <p style="margin: 8px 0 0 0;">Timestamp: ${new Date().toISOString()}</p>
                </div>
              </div>

              <!-- Footer -->
              <div style="text-align: center; margin-top: 40px;">
                <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                  © 2024 CashFlow Pro. All rights reserved.
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

    console.log("Feature request email sent successfully:", responseData);

    return new Response(JSON.stringify({ success: true, messageId: responseData.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-feature-request function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);