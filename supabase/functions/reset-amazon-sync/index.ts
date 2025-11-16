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

    console.log(`[RESET] Starting hard reset for account: ${accountId}`)

    // 1. Delete existing payouts for this account
    const { error: deleteError } = await supabase
      .from('amazon_payouts')
      .delete()
      .eq('amazon_account_id', accountId)

    if (deleteError) {
      console.error('[RESET] Error deleting payouts:', deleteError)
      throw deleteError
    }
    console.log('[RESET] Deleted existing payouts')

    // 2. Reset the account flags to allow a fresh historical sync
    const { data, error } = await supabase
      .from('amazon_accounts')
      .update({
        last_synced_to: null,
        sync_next_token: null,
        sync_status: 'idle',
        sync_progress: 0,
        sync_message: 'Ready to start fresh sync',
        initial_sync_complete: false
        // Removed payout_frequency: null because the DB requires a value
      })
      .eq('id', accountId)
      .select()

    if (error) throw error

    console.log('[RESET] Account flags reset:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account data deleted and sync state reset successfully. Ready for re-sync.',
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