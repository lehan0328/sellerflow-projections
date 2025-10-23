import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Amazon SP-API endpoints by region
const AMAZON_TOKEN_ENDPOINTS: Record<string, string> = {
  'US': 'https://api.amazon.com/auth/o2/token',
  'EU': 'https://api.amazon.co.uk/auth/o2/token',
  'FE': 'https://api.amazon.co.jp/auth/o2/token',
}

const AMAZON_SPAPI_ENDPOINTS: Record<string, string> = {
  'US': 'https://sellingpartnerapi-na.amazon.com',
  'EU': 'https://sellingpartnerapi-eu.amazon.com',
  'FE': 'https://sellingpartnerapi-fe.amazon.com',
}

// Marketplace to region mapping
const MARKETPLACE_REGIONS: Record<string, string> = {
  'ATVPDKIKX0DER': 'US', // United States
  'A2EUQ1WTGCTBG2': 'US', // Canada
  'A1AM78C64UM0Y8': 'US', // Mexico
  'A2Q3Y263D00KWC': 'US', // Brazil
  'A1PA6795UKMFR9': 'EU', // Germany
  'A1RKKUPIHCS9HS': 'EU', // Spain
  'A13V1IB3VIYZZH': 'EU', // France
  'APJ6JRA9NG5V4': 'EU', // Italy
  'A1F83G8C2ARO7P': 'EU', // United Kingdom
  'A21TJRUUN4KGV': 'EU', // India
  'A19VAU5U5O7RUS': 'FE', // Singapore
  'A39IBJ37TRP1C6': 'FE', // Australia
  'A1VC38T7YXB528': 'FE', // Japan
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('=== EXCHANGE AMAZON TOKEN FUNCTION STARTED ===');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id);

    const { code, selling_partner_id, marketplace_id, account_name } = await req.json()
    console.log('Request body:', { 
      hasCode: !!code, 
      selling_partner_id, 
      marketplace_id, 
      account_name 
    });

    if (!code || !selling_partner_id || !marketplace_id) {
      console.error('Missing parameters:', { 
        hasCode: !!code, 
        hasSellerId: !!selling_partner_id, 
        hasMarketplace: !!marketplace_id 
      });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Amazon LWA credentials from secrets
    const clientId = Deno.env.get('AMAZON_LWA_CLIENT_ID')
    const clientSecret = Deno.env.get('AMAZON_LWA_CLIENT_SECRET')

    console.log('Credentials check:', { 
      hasClientId: !!clientId, 
      hasClientSecret: !!clientSecret 
    });

    if (!clientId || !clientSecret) {
      console.error('Amazon credentials missing');
      return new Response(
        JSON.stringify({ error: 'Amazon credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine region from marketplace
    const region = MARKETPLACE_REGIONS[marketplace_id] || 'US'
    const tokenEndpoint = AMAZON_TOKEN_ENDPOINTS[region]

    console.log('Token exchange details:', { region, tokenEndpoint, marketplace_id });

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Amazon token exchange failed:', { 
        status: tokenResponse.status, 
        errorText 
      });
      throw new Error(`Failed to exchange authorization code: ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    console.log('Token exchange successful, has refresh token:', !!tokenData.refresh_token)

    // Get marketplace name from marketplace_id
    const marketplaceNames: Record<string, string> = {
      'ATVPDKIKX0DER': 'United States',
      'A2EUQ1WTGCTBG2': 'Canada',
      'A1AM78C64UM0Y8': 'Mexico',
      'A2Q3Y263D00KWC': 'Brazil',
      'A1PA6795UKMFR9': 'Germany',
      'A1RKKUPIHCS9HS': 'Spain',
      'A13V1IB3VIYZZH': 'France',
      'APJ6JRA9NG5V4': 'Italy',
      'A1F83G8C2ARO7P': 'United Kingdom',
      'A21TJRUUN4KGV': 'India',
      'A19VAU5U5O7RUS': 'Singapore',
      'A39IBJ37TRP1C6': 'Australia',
      'A1VC38T7YXB528': 'Japan',
    }

    const marketplace_name = marketplaceNames[marketplace_id] || 'Unknown'

    // Get user's account_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single()

    // Store account with encrypted tokens using the secure insert function
    const { data: accountData, error: insertError } = await supabase
      .rpc('insert_secure_amazon_account', {
        p_seller_id: selling_partner_id,
        p_marketplace_id: marketplace_id,
        p_marketplace_name: marketplace_name,
        p_account_name: account_name || `${marketplace_name} Store`,
        p_refresh_token: tokenData.refresh_token,
        p_access_token: tokenData.access_token,
        p_client_id: clientId,
        p_client_secret: clientSecret,
      })

    if (insertError) {
      console.error('Error storing Amazon account:', insertError)
      throw new Error('Failed to store Amazon account')
    }

    // Update the account with account_id and token expiry
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))
    await supabase
      .from('amazon_accounts')
      .update({
        account_id: profile?.account_id,
        token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', accountData)

    console.log('✅ Amazon account setup complete, starting initial sync...')

    // Trigger initial sync in background
    supabase.functions.invoke('sync-amazon-data', {
      body: { amazonAccountId: accountData }
    }).then(({ data: syncData, error: syncError }) => {
      if (syncError) {
        console.error('❌ Initial sync failed:', syncError)
      } else {
        console.log('✅ Initial sync completed:', syncData)
      }
    }).catch(console.error)

    return new Response(
      JSON.stringify({
        success: true,
        account_id: accountData,
        message: 'Amazon account connected successfully. Initial sync started.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in exchange-amazon-token function:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})