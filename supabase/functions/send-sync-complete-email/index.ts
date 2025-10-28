import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncCompleteEmailRequest {
  userId: string;
  accountName: string;
  transactionCount: number;
  settlementCount: number;
  syncDuration: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, accountName, transactionCount, settlementCount, syncDuration }: SyncCompleteEmailRequest = await req.json();

    console.log('[EMAIL] Sending sync complete email for user:', userId);

    // Get user email and notification preference
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('[EMAIL] Error fetching profile:', profileError);
      throw new Error('User not found');
    }

    // Get user email from auth.users
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user?.email) {
      console.error('[EMAIL] Error fetching user email:', userError);
      throw new Error('User email not found');
    }

    // Check if user has sync notifications enabled
    const { data: account, error: accountError } = await supabase
      .from('amazon_accounts')
      .select('sync_notifications_enabled')
      .eq('user_id', userId)
      .eq('account_name', accountName)
      .single();

    if (accountError || !account?.sync_notifications_enabled) {
      console.log('[EMAIL] Sync notifications disabled for user');
      return new Response(JSON.stringify({ message: 'Notifications disabled' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('[EMAIL] Sending email to:', user.email);

    const emailResponse = await resend.emails.send({
      from: "Auren <notifications@aurenapp.com>",
      to: [user.email],
      subject: `Amazon Sync Complete - ${accountName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
                  ✅ Sync Complete
                </h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px 24px;">
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  Your Amazon account sync has finished successfully!
                </p>
                
                <!-- Stats Cards -->
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <h2 style="color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px 0;">
                    Sync Summary
                  </h2>
                  
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                      <div style="color: #6c757d; font-size: 13px; margin-bottom: 4px;">Account</div>
                      <div style="color: #212529; font-size: 18px; font-weight: 600;">${accountName}</div>
                    </div>
                    
                    <div>
                      <div style="color: #6c757d; font-size: 13px; margin-bottom: 4px;">Duration</div>
                      <div style="color: #212529; font-size: 18px; font-weight: 600;">${syncDuration}</div>
                    </div>
                  </div>
                  
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #dee2e6;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                      <span style="color: #6c757d; font-size: 14px;">Transactions Synced</span>
                      <span style="color: #212529; font-size: 16px; font-weight: 600;">${transactionCount.toLocaleString()}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6c757d; font-size: 14px;">Settlements Loaded</span>
                      <span style="color: #212529; font-size: 16px; font-weight: 600;">${settlementCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 32px 0;">
                  <a href="https://aurenapp.com/dashboard" 
                     style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                    View Your Dashboard
                  </a>
                </div>
                
                <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
                  Your cash flow forecast is now updated with the latest data.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #dee2e6;">
                <p style="color: #6c757d; font-size: 13px; margin: 0 0 12px 0;">
                  You're receiving this because you enabled sync notifications.
                </p>
                <a href="https://aurenapp.com/settings?section=amazon" 
                   style="color: #667eea; text-decoration: none; font-size: 13px; font-weight: 500;">
                  Manage notification preferences
                </a>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("[EMAIL] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[EMAIL] Error sending sync complete email:", error);
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
