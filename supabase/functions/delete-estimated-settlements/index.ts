import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    console.log('[DELETE-ESTIMATED] Starting cleanup for user:', user.id)

    // Delete all estimated settlements for this user
    const { data: deleted, error: deleteError } = await supabase
      .from('amazon_payouts')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'estimated')
      .select('id, payout_date, total_amount')

    if (deleteError) {
      console.error('[DELETE-ESTIMATED] Error:', deleteError)
      throw new Error('Failed to delete estimated settlements')
    }

    const deletedCount = deleted?.length || 0
    console.log(`[DELETE-ESTIMATED] Successfully deleted ${deletedCount} estimated settlements`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount,
        message: `Deleted ${deletedCount} estimated settlements`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[DELETE-ESTIMATED] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
