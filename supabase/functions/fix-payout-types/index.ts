import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('[FIX] Fixing payout types for user:', user.id)

    // 1. Update account to bi-weekly
    const { error: accountError } = await supabase
      .from('amazon_accounts')
      .update({
        payout_frequency: 'bi-weekly',
        payout_model: 'bi-weekly',
        uses_daily_payouts: false
      })
      .eq('user_id', user.id)

    if (accountError) {
      console.error('[FIX] Account update error:', accountError)
      throw accountError
    }

    console.log('[FIX] Updated account to bi-weekly')

    // 2. Update all settlements to bi-weekly
    const { error: payoutsError } = await supabase
      .from('amazon_payouts')
      .update({ payout_type: 'bi-weekly' })
      .eq('user_id', user.id)
      .eq('payout_type', 'daily')

    if (payoutsError) {
      console.error('[FIX] Payouts update error:', payoutsError)
      throw payoutsError
    }

    console.log('[FIX] Updated settlements to bi-weekly')

    // 3. Delete old estimated settlements (past dates)
    const { error: deleteError } = await supabase
      .from('amazon_payouts')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'estimated')
      .lt('payout_date', new Date().toISOString().split('T')[0])

    if (deleteError) {
      console.error('[FIX] Delete error:', deleteError)
      throw deleteError
    }

    console.log('[FIX] Deleted old estimated settlements')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account and payouts updated to bi-weekly, old estimates removed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[FIX] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
