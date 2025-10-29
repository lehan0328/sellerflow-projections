import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { oldAccountId } = await req.json()

    if (!oldAccountId) {
      throw new Error('Old account ID is required')
    }

    // Delete transactions from old account
    const { error: transactionsError, count: deletedCount } = await supabase
      .from('amazon_transactions')
      .delete({ count: 'exact' })
      .eq('amazon_account_id', oldAccountId)
      .eq('user_id', user.id)

    if (transactionsError) {
      console.error('Error deleting transactions:', transactionsError)
      throw transactionsError
    }

    // Delete the old Amazon account
    const { error: accountError } = await supabase
      .from('amazon_accounts')
      .delete()
      .eq('id', oldAccountId)
      .eq('user_id', user.id)

    if (accountError) {
      console.error('Error deleting account:', accountError)
      throw accountError
    }

    console.log(`Cleaned up ${deletedCount} transactions and deleted account ${oldAccountId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${deletedCount} transactions and removed old account`,
        deletedTransactions: deletedCount
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
