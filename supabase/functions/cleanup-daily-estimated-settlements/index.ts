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
    
    console.log('[CLEANUP] Starting cleanup of daily account estimated settlements...')

    // Get all estimated settlements for daily accounts
    const { data: settlements, error: fetchError } = await supabase
      .from('amazon_payouts')
      .select(`
        id,
        settlement_id,
        payout_date,
        total_amount,
        amazon_accounts!inner(payout_frequency)
      `)
      .eq('status', 'estimated')
      .eq('amazon_accounts.payout_frequency', 'daily')

    if (fetchError) throw fetchError

    console.log(`Found ${settlements?.length || 0} estimated settlements for daily accounts`)

    if (settlements && settlements.length > 0) {
      const ids = settlements.map(s => s.id)
      
      // Delete them
      const { error: deleteError } = await supabase
        .from('amazon_payouts')
        .delete()
        .in('id', ids)

      if (deleteError) throw deleteError

      console.log(`Deleted ${ids.length} estimated settlements`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount: settlements?.length || 0,
        message: 'Daily account estimated settlements cleaned up successfully'
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
