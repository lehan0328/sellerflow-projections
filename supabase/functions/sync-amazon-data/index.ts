import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { amazonAccountId } = await req.json()

    if (!amazonAccountId) {
      return new Response(
        JSON.stringify({ error: 'Amazon account ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the Amazon account with encrypted credentials
    const { data: amazonAccount, error: accountError } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('id', amazonAccountId)
      .eq('user_id', user.id)
      .single()

    if (accountError || !amazonAccount) {
      return new Response(
        JSON.stringify({ error: 'Amazon account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For now, simulate Amazon API data since setting up SP-API requires extensive configuration
    // In production, you would decrypt credentials and call Amazon SP-API here
    console.log(`Syncing Amazon account: ${amazonAccount.account_name} (${amazonAccount.payout_frequency} payouts)`)

    // Simulate transaction data based on the current date
    const now = new Date()
    const transactionsToAdd = []
    const payoutsToAdd = []

    // Generate sample transactions for the last 30 days
    for (let i = 0; i < 30; i++) {
      const transactionDate = new Date(now)
      transactionDate.setDate(now.getDate() - i)
      const transactionDateStr = transactionDate.toISOString().split('T')[0]
      
      // Simulate various transaction types
      const transactionTypes = [
        { type: 'Order', amount: Math.random() * 500 + 50, description: 'Product Sale' },
        { type: 'FBAInventoryFee', amount: -(Math.random() * 20 + 5), description: 'FBA Storage Fee' },
        { type: 'Refund', amount: -(Math.random() * 100 + 25), description: 'Customer Refund' },
        { type: 'ShippingCharge', amount: Math.random() * 15 + 5, description: 'Shipping Revenue' }
      ]

      const randomTransaction = transactionTypes[Math.floor(Math.random() * transactionTypes.length)]
      
      // Use deterministic transaction ID based on account, date, and index
      const transactionId = `AMZ-${amazonAccountId.slice(0, 8)}-${transactionDateStr}-${i}`
      
      transactionsToAdd.push({
        user_id: user.id,
        amazon_account_id: amazonAccountId,
        transaction_id: transactionId,
        transaction_type: randomTransaction.type,
        amount: randomTransaction.amount,
        currency_code: 'USD',
        transaction_date: transactionDate.toISOString(),
        settlement_id: `S${Math.floor(new Date(transactionDateStr).getTime() / 1000)}`,
        marketplace_name: amazonAccount.marketplace_name,
        description: randomTransaction.description
      })
    }

    // Generate payouts based on frequency
    const payoutDates = []
    const payoutFrequency = amazonAccount.payout_frequency || 'bi-weekly'
    
    if (payoutFrequency === 'daily') {
      // Generate next 14 daily payouts
      for (let i = 0; i < 14; i++) {
        const payoutDate = new Date(now)
        payoutDate.setDate(now.getDate() + i)
        payoutDates.push(payoutDate)
      }
    } else {
      // Generate bi-weekly payouts (current and next upcoming only)
      for (let i = 0; i < 2; i++) {
        const payoutDate = new Date(now)
        payoutDate.setDate(now.getDate() + (i * 14))
        payoutDates.push(payoutDate)
      }
    }

    for (const [index, payoutDate] of payoutDates.entries()) {
      const isConfirmed = index === 0 // First payout is confirmed
      const payoutDateStr = payoutDate.toISOString().split('T')[0]
      
      // Use date-based settlement ID so re-syncing doesn't create duplicates
      const settlementId = `SETTLEMENT-${amazonAccountId.slice(0, 8)}-${payoutDateStr}`
      
      // Generate consistent amounts based on the date (for demo purposes)
      const seed = new Date(payoutDateStr).getTime()
      const totalAmount = 1000 + (seed % 3000)
      
      payoutsToAdd.push({
        user_id: user.id,
        amazon_account_id: amazonAccountId,
        settlement_id: settlementId,
        payout_date: payoutDateStr,
        total_amount: totalAmount,
        currency_code: 'USD',
        status: isConfirmed ? 'confirmed' : 'estimated',
        payout_type: 'bi-weekly',
        marketplace_name: amazonAccount.marketplace_name,
        transaction_count: Math.floor((seed % 50)) + 20,
        fees_total: totalAmount * 0.15,
        orders_total: totalAmount * 1.2,
        refunds_total: totalAmount * 0.05,
        other_total: totalAmount * 0.02
      })
    }

    // Insert transactions (with conflict resolution)
    if (transactionsToAdd.length > 0) {
      const { error: transactionError } = await supabase
        .from('amazon_transactions')
        .upsert(transactionsToAdd, { 
          onConflict: 'amazon_account_id,transaction_id',
          ignoreDuplicates: true 
        })

      if (transactionError) {
        console.error('Error inserting transactions:', transactionError)
      }
    }

    // Before inserting actual payouts, check for existing forecasted payouts
    // and update them with actual data while preserving forecast for comparison
    if (payoutsToAdd.length > 0) {
      for (const payout of payoutsToAdd) {
        // Find any existing forecasted payout for this date
        const { data: existingForecasts } = await supabase
          .from('amazon_payouts')
          .select('*')
          .eq('amazon_account_id', payout.amazon_account_id)
          .eq('payout_date', payout.payout_date)
          .eq('status', 'forecasted')
          .maybeSingle()

        if (existingForecasts) {
          // We found a forecasted payout - replace it with actual data
          const forecastAmount = Number(existingForecasts.total_amount)
          const actualAmount = Number(payout.total_amount)
          const accuracy = actualAmount > 0 
            ? (100 - Math.abs(((actualAmount - forecastAmount) / actualAmount) * 100))
            : 0

          console.log(`Replacing forecast for ${payout.payout_date}: Forecast=$${forecastAmount}, Actual=$${actualAmount}, Accuracy=${accuracy.toFixed(2)}%`)

          // Update the existing record with actual data + forecast comparison
          await supabase
            .from('amazon_payouts')
            .update({
              ...payout,
              original_forecast_amount: forecastAmount,
              forecast_replaced_at: new Date().toISOString(),
              forecast_accuracy_percentage: accuracy,
              status: payout.status // Use actual status (confirmed/estimated)
            })
            .eq('id', existingForecasts.id)
        } else {
          // No forecast exists, just insert the actual payout
          await supabase
            .from('amazon_payouts')
            .upsert(payout, { 
              onConflict: 'amazon_account_id,settlement_id',
              ignoreDuplicates: false 
            })
        }
      }
    }

    // Update last sync time
    await supabase
      .from('amazon_accounts')
      .update({ last_sync: now.toISOString() })
      .eq('id', amazonAccountId)
      .eq('user_id', user.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Amazon data synced successfully',
        transactionsAdded: transactionsToAdd.length,
        payoutsAdded: payoutsToAdd.length
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in sync-amazon-data function:', error)
    
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