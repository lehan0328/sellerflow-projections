import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { accountId } = await req.json()

    if (!accountId) {
      throw new Error('Account ID is required')
    }

    // Reset the account to start fresh historical sync
    const { data, error } = await supabase
      .from('amazon_accounts')
      .update({
        last_synced_to: null,
        sync_next_token: null,
        sync_status: 'idle',
        sync_progress: 0,
        sync_message: 'Ready to start fresh sync',
        initial_sync_complete: false
      })
      .eq('id', accountId)
      .select()

    if (error) throw error

    console.log('Reset account:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account sync state reset successfully',
        account: data[0]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
