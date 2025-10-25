import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Compaction job for Amazon data
 * Runs nightly to:
 * 1. Aggregate transactions older than 180 days into daily_rollups
 * 2. Mark aggregated transactions for deletion
 * 3. Delete marked transactions to conserve storage
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('[COMPACT] Starting Amazon data compaction...')

    // Calculate the 180-day cutoff (keep transactions for last 180 days)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 180)
    sixtyDaysAgo.setHours(0, 0, 0, 0)

    console.log('[COMPACT] Cutoff date:', sixtyDaysAgo.toISOString())

    // Get all active Amazon accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('amazon_accounts')
      .select('id, user_id, account_id, marketplace_name')
      .eq('is_active', true)

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`)
    }

    console.log(`[COMPACT] Found ${accounts?.length || 0} active accounts`)

    let totalCompacted = 0
    let totalDeleted = 0

    for (const account of accounts || []) {
      console.log(`[COMPACT] Processing account: ${account.id}`)

      // Fetch old transactions that haven't been compacted yet
      const { data: oldTransactions, error: txError } = await supabase
        .from('amazon_transactions')
        .select('*')
        .eq('amazon_account_id', account.id)
        .lt('transaction_date', sixtyDaysAgo.toISOString())
        .eq('is_compacted', false)
        .order('transaction_date', { ascending: true })

      if (txError) {
        console.error(`[COMPACT] Error fetching transactions for ${account.id}:`, txError)
        continue
      }

      if (!oldTransactions || oldTransactions.length === 0) {
        console.log(`[COMPACT] No old transactions to compact for account ${account.id}`)
        continue
      }

      console.log(`[COMPACT] Found ${oldTransactions.length} transactions to compact`)

      // Group transactions by date
      const transactionsByDate = new Map<string, any[]>()
      
      for (const tx of oldTransactions) {
        const dateKey = new Date(tx.transaction_date).toISOString().split('T')[0]
        if (!transactionsByDate.has(dateKey)) {
          transactionsByDate.set(dateKey, [])
        }
        transactionsByDate.get(dateKey)!.push(tx)
      }

      console.log(`[COMPACT] Grouped into ${transactionsByDate.size} days`)

      // Create rollups for each day
      const rollupsToUpsert = []

      for (const [dateKey, dayTransactions] of transactionsByDate.entries()) {
        const rollup = {
          user_id: account.user_id,
          account_id: account.account_id,
          amazon_account_id: account.id,
          rollup_date: dateKey,
          total_orders: 0,
          total_revenue: 0,
          total_fees: 0,
          total_refunds: 0,
          total_net: 0,
          order_count: 0,
          refund_count: 0,
          adjustment_count: 0,
          fee_count: 0,
          currency_code: dayTransactions[0]?.currency_code || 'USD',
          marketplace_name: account.marketplace_name
        }

        for (const tx of dayTransactions) {
          const amount = parseFloat(tx.amount || 0)
          rollup.total_net += amount

          if (tx.transaction_type === 'Order') {
            rollup.order_count++
            rollup.total_revenue += amount
          } else if (tx.transaction_type === 'Refund') {
            rollup.refund_count++
            rollup.total_refunds += amount
          } else if (tx.transaction_type === 'Adjustment') {
            rollup.adjustment_count++
          } else if (tx.fee_type) {
            rollup.fee_count++
            rollup.total_fees += Math.abs(amount)
          }
        }

        rollupsToUpsert.push(rollup)
      }

      // Upsert rollups
      if (rollupsToUpsert.length > 0) {
        const { error: rollupError } = await supabase
          .from('amazon_daily_rollups')
          .upsert(rollupsToUpsert, { 
            onConflict: 'amazon_account_id,rollup_date',
            ignoreDuplicates: false 
          })

        if (rollupError) {
          console.error(`[COMPACT] Error upserting rollups:`, rollupError)
          continue
        }

        console.log(`[COMPACT] ✓ Created/updated ${rollupsToUpsert.length} rollups`)
        totalCompacted += rollupsToUpsert.length
      }

      // Mark transactions as compacted
      const transactionIds = oldTransactions.map(tx => tx.id)
      
      const { error: markError } = await supabase
        .from('amazon_transactions')
        .update({ is_compacted: true })
        .in('id', transactionIds)

      if (markError) {
        console.error(`[COMPACT] Error marking transactions:`, markError)
        continue
      }

      console.log(`[COMPACT] ✓ Marked ${transactionIds.length} transactions as compacted`)

      // Delete compacted transactions
      const { error: deleteError } = await supabase
        .from('amazon_transactions')
        .delete()
        .in('id', transactionIds)

      if (deleteError) {
        console.error(`[COMPACT] Error deleting transactions:`, deleteError)
      } else {
        console.log(`[COMPACT] ✓ Deleted ${transactionIds.length} compacted transactions`)
        totalDeleted += transactionIds.length
      }
    }

    const summary = {
      success: true,
      accounts_processed: accounts?.length || 0,
      rollups_created: totalCompacted,
      transactions_deleted: totalDeleted,
      cutoff_date: sixtyDaysAgo.toISOString(),
      timestamp: new Date().toISOString()
    }

    console.log('[COMPACT] Summary:', summary)

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[COMPACT] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
