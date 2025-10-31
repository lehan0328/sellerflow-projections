import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error('Plaid credentials not configured');
    }

    console.log('Creating Plaid link token for user:', userId);

    // Determine the redirect URI based on the request origin
    const origin = req.headers.get('origin') || 'https://7a7abab6-1ab3-40f5-8847-2b043f3ea03c.lovableproject.com';
    const redirectUri = `${origin}/oauth-redirect`;

    console.log('Using OAuth redirect URI:', redirectUri);
    console.log('⚠️ IMPORTANT: Ensure this URI is added to Plaid Dashboard > Team Settings > API > Allowed redirect URIs');
    console.log('OAuth institutions like Chase require exact URI match in Plaid dashboard');

    // Create link token with Plaid API
    const response = await fetch(`https://${PLAID_ENV}.plaid.com/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        user: {
          client_user_id: userId,
        },
        client_name: 'Auren',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
        redirect_uri: redirectUri,
        account_filters: {
          depository: {
            account_subtypes: ['checking', 'savings'],
          },
          credit: {
            account_subtypes: ['credit card'],
          },
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Plaid API error:', data);
      throw new Error(data.error_message || 'Failed to create link token');
    }

    console.log('Successfully created link token');

    return new Response(
      JSON.stringify({ link_token: data.link_token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-plaid-link-token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
