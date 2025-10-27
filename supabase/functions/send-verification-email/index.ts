import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import React from 'npm:react@18.3.1';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { VerificationCodeEmail } from './_templates/verification-code.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    // Verify webhook signature
    const wh = new Webhook(hookSecret);
    let verifiedPayload;
    
    try {
      verifiedPayload = wh.verify(payload, headers) as {
        user: {
          email: string;
          id: string;
        };
        email_data: {
          token: string;
          token_hash: string;
          redirect_to: string;
          email_action_type: string;
          site_url: string;
        };
      };
    } catch (error) {
      console.error('Webhook verification failed:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { user, email_data } = verifiedPayload;
    const { token, token_hash, redirect_to, email_action_type } = email_data;

    console.log(`[VERIFICATION EMAIL] Sending to ${user.email} (${email_action_type})`);

    // Render the React Email template
    const html = await renderAsync(
      React.createElement(VerificationCodeEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token,
        token_hash,
        redirect_to,
        email_action_type,
      })
    );

    // Send email via Resend
    const { error } = await resend.emails.send({
      from: 'Auren <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Verify your Auren account',
      html,
    });

    if (error) {
      console.error('[VERIFICATION EMAIL] Resend error:', error);
      throw error;
    }

    console.log(`[VERIFICATION EMAIL] ✓ Sent to ${user.email}`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[VERIFICATION EMAIL] Error:', error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: error.code || 500,
          message: error.message || 'Internal server error',
        },
      }),
      {
        status: error.code || 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
