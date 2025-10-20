import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Amazon SP-API token endpoints by region
const AMAZON_TOKEN_ENDPOINTS: Record<string, string> = {
  'US': 'https://api.amazon.com/auth/o2/token',
  'EU': 'https://api.amazon.co.uk/auth/o2/token',
  'FE': 'https://api.amazon.co.jp/auth/o2/token',
}

const MARKETPLACE_REGIONS: Record<string, string> = {
  'ATVPDKIKX0DER': 'US',
  'A2EUQ1WTGCTBG2': 'US',
  'A1AM78C64UM0Y8': 'US',
  'A2Q3Y263D00KWC': 'US',
  'A1PA6795UKMFR9': 'EU',
  'A1RKKUPIHCS9HS': 'EU',
  'A13V1IB3VIYZZH': 'EU',
  'APJ6JRA9NG5V4': 'EU',
  'A1F83G8C2ARO7P': 'EU',
  'A21TJRUUN4KGV': 'EU',
  'A19VAU5U5O7RUS': 'FE',
  'A39IBJ37TRP1C6': 'FE',
  'A1VC38T7YXB528': 'FE',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { amazon_account_id } = await req.json()

    if (!amazon_account_id) {
      return new Response(
        JSON.stringify({ error: 'Amazon account ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Amazon account with encrypted credentials
    const { data: account, error: accountError } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('id', amazon_account_id)
      .single()

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: 'Amazon account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decrypt credentials (they're stored using encryption functions)
    const { data: decryptedRefreshToken } = await supabase
      .rpc('decrypt_banking_credential', { encrypted_text: account.encrypted_refresh_token })

    const { data: decryptedClientId } = await supabase
      .rpc('decrypt_banking_credential', { encrypted_text: account.encrypted_client_id })

    const { data: decryptedClientSecret } = await supabase
      .rpc('decrypt_banking_credential', { encrypted_text: account.encrypted_client_secret })

    if (!decryptedRefreshToken || !decryptedClientId || !decryptedClientSecret) {
      throw new Error('Failed to decrypt Amazon credentials')
    }

    // Determine region and endpoint
    const region = MARKETPLACE_REGIONS[account.marketplace_id] || 'US'
    const tokenEndpoint = AMAZON_TOKEN_ENDPOINTS[region]

    console.log(`Refreshing token for account ${account.account_name} (${region})`)

    // Refresh the access token
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: decryptedRefreshToken,
        client_id: decryptedClientId,
        client_secret: decryptedClientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token refresh failed:', errorText)
      throw new Error('Failed to refresh access token')
    }

    const tokenData = await tokenResponse.json()
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

    console.log('Token refreshed successfully, expires at:', expiresAt)

    // Update account with new access token
    await supabase
      .rpc('update_secure_amazon_account', {
        p_account_id: amazon_account_id,
        p_access_token: tokenData.access_token,
        p_token_expires_at: expiresAt.toISOString(),
      })

    return new Response(
      JSON.stringify({
        success: true,
        access_token: tokenData.access_token,
        expires_at: expiresAt.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error refreshing Amazon token:', error)
    
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