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
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('[AGGREGATE] Starting transaction aggregation job...')

    // Get cutoff date (60 days ago) - archive older data
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 60)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    console.log('[AGGREGATE] Aggregating transactions older than:', cutoffDateStr)
    console.log('[AGGREGATE] NOTE: Payouts are never deleted - only transactions')

    // Get all Amazon accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('amazon_accounts')
      .select('id, user_id, account_id')

    if (accountsError) {
      throw accountsError
    }

    console.log(`[AGGREGATE] Found ${accounts?.length || 0} Amazon accounts`)

    let totalAggregated = 0
    let totalDeleted = 0

    // Process each account
    for (const account of accounts || []) {
      console.log(`\n[AGGREGATE] Processing account: ${account.id}`)

      // Get old transactions grouped by date
      const { data: oldTransactions, error: txError } = await supabase
        .from('amazon_transactions')
        .select('*')
        .eq('amazon_account_id', account.id)
        .lt('transaction_date', cutoffDateStr)
        .order('transaction_date', { ascending: true })

      if (txError) {
        console.error(`[AGGREGATE] Error fetching transactions for ${account.id}:`, txError)
        continue
      }

      if (!oldTransactions || oldTransactions.length === 0) {
        console.log(`[AGGREGATE] No old transactions found for account ${account.id}`)
        continue
      }

      console.log(`[AGGREGATE] Found ${oldTransactions.length} old transactions to aggregate`)

      // Group by date
      const dailyGroups: Record<string, any[]> = {}
      for (const tx of oldTransactions) {
        const dateKey = tx.transaction_date.split('T')[0]
        if (!dailyGroups[dateKey]) {
          dailyGroups[dateKey] = []
        }
        dailyGroups[dateKey].push(tx)
      }

      console.log(`[AGGREGATE] Grouped into ${Object.keys(dailyGroups).length} daily buckets`)

      // Create daily summaries
      const summariesToInsert = []
      for (const [date, transactions] of Object.entries(dailyGroups)) {
        const summary = {
          user_id: account.user_id,
          account_id: account.account_id,
          amazon_account_id: account.id,
          transaction_date: date,
          orders_count: 0,
          orders_total: 0,
          refunds_count: 0,
          refunds_total: 0,
          fees_total: 0,
          adjustments_total: 0,
          net_amount: 0,
          transaction_count: transactions.length,
          marketplace_name: transactions[0]?.marketplace_name,
          currency_code: transactions[0]?.currency_code || 'USD',
          settlement_id: transactions[0]?.settlement_id
        }

        for (const tx of transactions) {
          const amount = Number(tx.amount || 0)
          const grossAmount = Number(tx.gross_amount || 0)

          if (tx.transaction_type === 'Order' || tx.transaction_type === 'Sale') {
            summary.orders_count++
            summary.orders_total += grossAmount || amount
          } else if (tx.transaction_type === 'Refund') {
            summary.refunds_count++
            summary.refunds_total += Math.abs(amount)
          } else if (tx.transaction_type?.includes('Fee')) {
            summary.fees_total += Math.abs(amount)
          } else {
            summary.adjustments_total += amount
          }

          summary.net_amount += amount
        }

        summariesToInsert.push(summary)
      }

      // Insert summaries (upsert to handle duplicates)
      if (summariesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('amazon_transactions_daily_summary')
          .upsert(summariesToInsert, {
            onConflict: 'amazon_account_id,transaction_date',
            ignoreDuplicates: false
          })

        if (insertError) {
          console.error(`[AGGREGATE] Error inserting summaries:`, insertError)
          continue
        }

        console.log(`[AGGREGATE] Created ${summariesToInsert.length} daily summaries`)
        totalAggregated += summariesToInsert.length

        // Delete old transactions
        const { error: deleteError } = await supabase
          .from('amazon_transactions')
          .delete()
          .eq('amazon_account_id', account.id)
          .lt('transaction_date', cutoffDateStr)

        if (deleteError) {
          console.error(`[AGGREGATE] Error deleting old transactions:`, deleteError)
        } else {
          console.log(`[AGGREGATE] Deleted ${oldTransactions.length} old transactions`)
          totalDeleted += oldTransactions.length
        }
      }
    }

    console.log('\n[AGGREGATE] Job complete!')
    console.log(`[AGGREGATE] Total daily summaries created: ${totalAggregated}`)
    console.log(`[AGGREGATE] Total old transactions deleted: ${totalDeleted}`)
    console.log(`[AGGREGATE] Storage saved: ~${(totalDeleted * 2 / 1024).toFixed(2)} MB`)

    return new Response(
      JSON.stringify({
        success: true,
        accounts_processed: accounts?.length || 0,
        summaries_created: totalAggregated,
        transactions_deleted: totalDeleted,
        storage_saved_mb: (totalDeleted * 2 / 1024).toFixed(2)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[AGGREGATE] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})