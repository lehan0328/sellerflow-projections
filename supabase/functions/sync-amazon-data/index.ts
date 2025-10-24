import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Amazon SP-API endpoints by region
const AMAZON_SPAPI_ENDPOINTS: Record<string, string> = {
  'US': 'https://sellingpartnerapi-na.amazon.com',
  'EU': 'https://sellingpartnerapi-eu.amazon.com',
  'FE': 'https://sellingpartnerapi-fe.amazon.com',
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { amazonAccountId, userId, cronJob } = await req.json()

    console.log(`[SYNC] Starting sync - Account: ${amazonAccountId}, User: ${userId}, Cron: ${cronJob}`)

    if (!amazonAccountId) {
      return new Response(
        JSON.stringify({ error: 'Amazon account ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let actualUserId = userId
    
    // Only check auth for manual syncs
    if (!cronJob) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        console.error('[SYNC] No auth header')
        return new Response(
          JSON.stringify({ error: 'No authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        console.error('[SYNC] Auth error:', authError)
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      actualUserId = user.id
    }

    // Set initial sync status
    console.log('[SYNC] Setting status to syncing...')
    const { error: statusError } = await supabase
      .from('amazon_accounts')
      .update({ 
        sync_status: 'syncing', 
        sync_progress: 0,
        sync_message: 'Starting sync...',
        last_sync_error: null 
      })
      .eq('id', amazonAccountId)

    if (statusError) {
      console.error('[SYNC] Failed to update status:', statusError)
    }

    // Start background sync
    const syncTask = async () => {
      try {
        console.log('[SYNC] Background task started')
        
        // Update progress
        await supabase
          .from('amazon_accounts')
          .update({ 
            sync_progress: 5,
            sync_message: 'Fetching account details...'
          })
          .eq('id', amazonAccountId)
        
        // Get Amazon account
        const { data: amazonAccount, error: accountError } = await supabase
          .from('amazon_accounts')
          .select('*')
          .eq('id', amazonAccountId)
          .single()

        if (accountError || !amazonAccount) {
          console.error('[SYNC] Account not found:', accountError)
          throw new Error(`Amazon account not found: ${accountError?.message}`)
        }

        console.log('[SYNC] Account found:', amazonAccount.account_name)
        console.log('[SYNC] Seller ID:', amazonAccount.seller_id)
        console.log('[SYNC] Marketplace:', amazonAccount.marketplace_name)
        
        // Check rate limiting
        const lastSync = amazonAccount.last_sync ? new Date(amazonAccount.last_sync) : null
        const timeSinceLastSync = lastSync ? (Date.now() - lastSync.getTime()) / 1000 : Infinity
        const RATE_LIMIT_SECONDS = 240 // 4 minutes between syncs (cron runs every 5 min)
        
        if (timeSinceLastSync < RATE_LIMIT_SECONDS) {
          const waitTime = Math.ceil(RATE_LIMIT_SECONDS - timeSinceLastSync)
          console.log(`[SYNC] Rate limited. Wait ${waitTime}s`)
          await supabase
            .from('amazon_accounts')
            .update({
              sync_status: 'idle',
              sync_progress: 0,
              sync_message: `Rate limited. Try again in ${waitTime}s`,
              last_sync_error: `Must wait ${waitTime} seconds between syncs`
            })
            .eq('id', amazonAccountId)
          return
        }

        // Get or refresh access token
        console.log('[SYNC] Checking access token...')
        await supabase
          .from('amazon_accounts')
          .update({ 
            sync_progress: 10,
            sync_message: 'Refreshing access token...'
          })
          .eq('id', amazonAccountId)

        const tokenExpiresAt = amazonAccount.token_expires_at ? new Date(amazonAccount.token_expires_at) : null
        const needsRefresh = !amazonAccount.encrypted_access_token || !tokenExpiresAt || (tokenExpiresAt.getTime() - Date.now()) < 300000

        let accessToken = amazonAccount.encrypted_access_token

        if (needsRefresh) {
          console.log('[SYNC] Refreshing token...')
          const { data: refreshData, error: refreshError } = await supabase.functions.invoke('refresh-amazon-token', {
            body: { amazon_account_id: amazonAccountId }
          })

          if (refreshError || !refreshData?.access_token) {
            console.error('[SYNC] Token refresh failed:', refreshError)
            throw new Error(`Token refresh failed: ${refreshError?.message || 'Unknown error'}`)
          }

          accessToken = refreshData.access_token
          console.log('[SYNC] Token refreshed successfully')
        } else {
          console.log('[SYNC] Using existing token, decrypting...')
          const { data: decryptedToken } = await supabase
            .rpc('decrypt_banking_credential', { encrypted_text: accessToken })
          accessToken = decryptedToken
          console.log('[SYNC] Token decrypted')
        }

        // Determine API endpoint
        const region = MARKETPLACE_REGIONS[amazonAccount.marketplace_id] || 'US'
        const apiEndpoint = AMAZON_SPAPI_ENDPOINTS[region]
        console.log('[SYNC] Using endpoint:', apiEndpoint)

        // Update progress
        await supabase
          .from('amazon_accounts')
          .update({ 
            sync_progress: 15,
            sync_message: 'Connecting to Amazon API...'
          })
          .eq('id', amazonAccountId)

        // Fetch transactions
        const financialEventsUrl = `${apiEndpoint}/finances/v0/financialEvents`
        
        // Determine sync strategy: backfill (going backward) or incremental (going forward)
        let syncMode: 'backfill' | 'incremental' = 'incremental'
        let startDate: Date
        let endDate: Date | null = null
        
        if (amazonAccount.initial_sync_complete) {
          // INCREMENTAL: Fetch only new data from last sync
          syncMode = 'incremental'
          startDate = new Date(new Date(amazonAccount.last_sync).getTime() - (24 * 60 * 60 * 1000))
          endDate = null // No end date - fetch up to now
          console.log('[SYNC] Incremental mode - fetching from:', startDate.toISOString())
        } else {
          // BACKFILL: Continuous fetching without date gaps
          syncMode = 'backfill'
          const now = new Date()
          const targetDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000)) // 1 year ago
          
          // Find newest transaction to determine where to continue from
          const { data: newestTx } = await supabase
            .from('amazon_transactions')
            .select('transaction_date')
            .eq('amazon_account_id', amazonAccountId)
            .order('transaction_date', { ascending: false })
            .limit(1)
            .single()
          
          if (newestTx?.transaction_date) {
            // Continue from newest transaction forward to now
            startDate = new Date(new Date(newestTx.transaction_date).getTime() + 1000) // 1 second after newest
            endDate = null // Fetch up to now
            
            console.log('[SYNC] Backfill mode - continuing from newest transaction')
            console.log('[SYNC] Newest existing:', new Date(newestTx.transaction_date).toISOString())
            console.log('[SYNC] Fetching from:', startDate.toISOString(), 'to: NOW')
            
            // DON'T mark complete until we reach target date or API stops returning data
            // Check if oldest transaction is within target range
            const { data: oldestTx } = await supabase
              .from('amazon_transactions')
              .select('transaction_date')
              .eq('amazon_account_id', amazonAccountId)
              .order('transaction_date', { ascending: true })
              .limit(1)
              .single()
            
            if (oldestTx?.transaction_date) {
              const oldestDate = new Date(oldestTx.transaction_date)
              const daysOfHistory = Math.floor((now.getTime() - oldestDate.getTime()) / (24 * 60 * 60 * 1000))
              console.log(`[SYNC] Current history: ${daysOfHistory} days (target: 365 days)`)
              
              // Only mark complete if we have 365+ days OR startDate is caught up
              if (daysOfHistory >= 365 || startDate > new Date(now.getTime() - (24 * 60 * 60 * 1000))) {
                console.log('[SYNC] Marking backfill as complete')
                await supabase
                  .from('amazon_accounts')
                  .update({ 
                    initial_sync_complete: true,
                    backfill_complete: true
                  })
                  .eq('id', amazonAccountId)
              }
            }
          } else {
            // No data yet - start from 90 days ago to now
            startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
            endDate = null
            console.log('[SYNC] First backfill - fetching last 90 days from:', startDate.toISOString())
          }
        }

        const transactionsToAdd: any[] = []
        const payoutsToAdd: any[] = []
        let nextToken: string | undefined = undefined
        let pageCount = 0
        
        // No artificial limits - extract ALL transactions until API stops returning data
        console.log(`[SYNC] Starting pagination in ${syncMode} mode - will fetch ALL available data...`)

        do {
          pageCount++
          
          // Log progress every 10 pages to avoid spam
          if (pageCount % 10 === 0) {
            console.log(`[SYNC] Page ${pageCount} (${transactionsToAdd.length} transactions so far)`)
            const progressPercentage = Math.min(10 + Math.floor(pageCount / 2), 85)
            await supabase
              .from('amazon_accounts')
              .update({ 
                sync_progress: Math.round(progressPercentage),
                sync_message: `Fetching page ${pageCount}... ${transactionsToAdd.length} transactions`
              })
              .eq('id', amazonAccountId)
          }

          // Build URL - Amazon SP-API requires dates in ISO format
          let url = `${financialEventsUrl}?PostedAfter=${startDate.toISOString()}&MarketplaceId=${amazonAccount.marketplace_id}&MaxResultsPerPage=100`
          
          // Don't use PostedBefore unless we have a specific end date (it can cause issues)
          if (endDate) {
            url += `&PostedBefore=${endDate.toISOString()}`
          }
          
          if (nextToken) {
            url += `&NextToken=${encodeURIComponent(nextToken)}`
          }
          
          console.log(`[SYNC] Fetching: ${url.substring(0, 150)}...`)

          // Rate limit handling with exponential backoff
          let retryAttempts = 0
          let response: any
          const maxRetries = 5
          
          while (retryAttempts <= maxRetries) {
            response = await fetch(url, {
              headers: {
                'x-amz-access-token': accessToken,
                'Content-Type': 'application/json',
              }
            })

            // Handle rate limiting (429) and server errors (503)
            if (response.status === 429 || response.status === 503) {
              retryAttempts++
              if (retryAttempts > maxRetries) {
                throw new Error(`Max retries exceeded after ${maxRetries} attempts`)
              }
              
              // Exponential backoff: 2s, 4s, 8s, 16s, 32s
              const waitTime = Math.pow(2, retryAttempts) * 1000
              console.log(`[SYNC] Rate limited (${response.status}). Retry ${retryAttempts}/${maxRetries} in ${waitTime}ms...`)
              
              await new Promise(resolve => setTimeout(resolve, waitTime))
              continue
            }
            
            if (!response.ok) {
              const errorText = await response.text()
              console.error('[SYNC] API error:', errorText)
              throw new Error(`API failed: ${response.status} - ${errorText}`)
            }
            
            break // Success - exit retry loop
          }

          const data = await response.json()
          nextToken = data.payload?.NextToken

          // Process events
          const events = data.payload?.FinancialEvents || {}
          console.log('[SYNC] Event counts:', {
            shipments: (events.ShipmentEventList || []).length,
            refunds: (events.RefundEventList || []).length,
            adjustments: (events.AdjustmentEventList || []).length,
            settlements: (events.ShipmentSettleEventList || []).length
          })
          
          // Log event details for debugging
          const eventCounts = {
            shipments: (events.ShipmentEventList || []).length,
            refunds: (events.RefundEventList || []).length,
            adjustments: (events.AdjustmentEventList || []).length,
            settlements: (events.ShipmentSettleEventList || []).length,
            serviceFees: (events.ServiceFeeEventList || []).length,
            other: Object.keys(events).filter(k => !['ShipmentEventList', 'RefundEventList', 'AdjustmentEventList', 'ShipmentSettleEventList', 'ServiceFeeEventList'].includes(k)).length
          }
          
          if (eventCounts.settlements > 0) {
            console.log('[SYNC] ✓ Found settlement events:', eventCounts.settlements)
          }
          
          console.log('[SYNC] Events in this page:', eventCounts)

          // Process settlement events (Payouts)
          for (const settlement of (events.ShipmentSettleEventList || [])) {
            const settlementId = settlement.SettlementId
            const postedDate = settlement.PostedDate
            
            // Calculate total amounts from settlement
            let totalAmount = 0
            let ordersTotal = 0
            let feesTotal = 0
            let refundsTotal = 0
            
            for (const item of (settlement.ShipmentItemList || [])) {
              // Sum order amounts
              for (const charge of (item.ItemChargeList || [])) {
                const amount = parseFloat(charge.ChargeAmount?.CurrencyAmount || '0')
                totalAmount += amount
                ordersTotal += amount
              }
              
              // Sum fees (negative)
              for (const fee of (item.ItemFeeList || [])) {
                const feeAmount = parseFloat(fee.FeeAmount?.CurrencyAmount || '0')
                totalAmount += feeAmount
                feesTotal += Math.abs(feeAmount)
              }
            }
            
            // Add settlement/payout record
            payoutsToAdd.push({
              user_id: actualUserId,
              account_id: amazonAccount.account_id,
              amazon_account_id: amazonAccountId,
              settlement_id: settlementId,
              payout_date: postedDate,
              total_amount: totalAmount,
              orders_total: ordersTotal,
              fees_total: -feesTotal,
              refunds_total: refundsTotal,
              currency_code: settlement.Currency || 'USD',
              status: 'confirmed',
              payout_type: amazonAccount.payout_frequency || 'bi-weekly',
              raw_data: settlement
            })
          }

          // Process shipment events (Orders)
          for (const shipment of (events.ShipmentEventList || [])) {
            const orderId = shipment.AmazonOrderId
            const shipmentDate = shipment.PostedDate
            
            for (const item of (shipment.ShipmentItemList || [])) {
              let totalAmount = 0
              let grossAmount = 0
              
              // Calculate amounts
              for (const charge of (item.ItemChargeList || [])) {
                const amount = parseFloat(charge.ChargeAmount?.CurrencyAmount || '0')
                totalAmount += amount
                if (charge.ChargeType === 'Principal') {
                  grossAmount += amount
                }
              }
              
              for (const fee of (item.ItemFeeList || [])) {
                const feeAmount = parseFloat(fee.FeeAmount?.CurrencyAmount || '0')
                totalAmount += feeAmount
              }

              transactionsToAdd.push({
                user_id: actualUserId,
                account_id: amazonAccount.account_id,
                amazon_account_id: amazonAccountId,
                transaction_id: `${orderId}-${item.SellerSKU || 'unknown'}-${shipmentDate}`,
                order_id: orderId,
                transaction_type: 'Order',
                transaction_date: shipmentDate,
                amount: totalAmount,
                gross_amount: grossAmount,
                currency_code: item.ItemChargeList?.[0]?.ChargeAmount?.CurrencyCode || 'USD',
                sku: item.SellerSKU,
                marketplace_name: amazonAccount.marketplace_name,
                raw_data: shipment
              })
            }
          }

          // Process refund events
          for (const refund of (events.RefundEventList || [])) {
            const orderId = refund.AmazonOrderId
            const refundDate = refund.PostedDate
            
            for (const item of (refund.ShipmentItemAdjustmentList || [])) {
              let totalAmount = 0
              
              for (const charge of (item.ItemChargeAdjustmentList || [])) {
                totalAmount += parseFloat(charge.ChargeAmount?.CurrencyAmount || '0')
              }
              
              for (const fee of (item.ItemFeeAdjustmentList || [])) {
                totalAmount += parseFloat(fee.FeeAmount?.CurrencyAmount || '0')
              }

              transactionsToAdd.push({
                user_id: actualUserId,
                account_id: amazonAccount.account_id,
                amazon_account_id: amazonAccountId,
                transaction_id: `${orderId}-refund-${item.SellerSKU || 'unknown'}-${refundDate}`,
                order_id: orderId,
                transaction_type: 'Refund',
                transaction_date: refundDate,
                amount: totalAmount,
                gross_amount: totalAmount,
                currency_code: item.ItemChargeAdjustmentList?.[0]?.ChargeAmount?.CurrencyCode || 'USD',
                sku: item.SellerSKU,
                marketplace_name: amazonAccount.marketplace_name,
                raw_data: refund
              })
            }
          }

        } while (nextToken) // Continue until Amazon stops returning data
        
        console.log(`[SYNC] Pagination complete after ${pageCount} pages`)
        console.log(`[SYNC] Extracted: ${transactionsToAdd.length} transactions, ${payoutsToAdd.length} payouts`)
        console.log(`[SYNC] Date range: ${startDate.toISOString()} to ${endDate ? endDate.toISOString() : 'NOW'}`)

        // Update progress
        await supabase
          .from('amazon_accounts')
          .update({ 
            sync_progress: 90,
            sync_message: `Saving ${transactionsToAdd.length} transactions and ${payoutsToAdd.length} payouts...`
          })
          .eq('id', amazonAccountId)

        // Save payouts first
        if (payoutsToAdd.length > 0) {
          const uniquePayouts = payoutsToAdd.reduce((acc, payout) => {
            const key = payout.settlement_id
            if (!acc.has(key)) {
              acc.set(key, payout)
            }
            return acc
          }, new Map())
          
          const deduplicatedPayouts = Array.from(uniquePayouts.values())
          console.log(`[SYNC] Saving ${deduplicatedPayouts.length} unique payouts...`)
          
          const { error: payoutError } = await supabase
            .from('amazon_payouts')
            .upsert(deduplicatedPayouts, { onConflict: 'settlement_id' })
          
          if (payoutError) {
            console.error('[SYNC] Payout insert error:', payoutError)
          } else {
            console.log(`[SYNC] ✓ Saved ${deduplicatedPayouts.length} payouts`)
          }
        }

        // Save transactions in batches
        if (transactionsToAdd.length > 0) {
          // Deduplicate transactions before inserting (to avoid "cannot affect row a second time" errors)
          const uniqueTransactions = transactionsToAdd.reduce((acc, tx) => {
            const key = `${tx.transaction_id}-${tx.posted_date}`
            if (!acc.has(key)) {
              acc.set(key, tx)
            }
            return acc
          }, new Map())
          
          const deduplicatedTransactions = Array.from(uniqueTransactions.values())
          console.log(`[SYNC] Saving ${deduplicatedTransactions.length} unique transactions (${transactionsToAdd.length - deduplicatedTransactions.length} duplicates removed)...`)
          
          const batchSize = 100
          let savedCount = 0
          
          for (let i = 0; i < deduplicatedTransactions.length; i += batchSize) {
            const batch = deduplicatedTransactions.slice(i, i + batchSize)
            const { error: insertError } = await supabase
              .from('amazon_transactions')
              .upsert(batch, { onConflict: 'transaction_id' })
            
            if (insertError) {
              console.error('[SYNC] Batch insert error:', insertError)
            } else {
              savedCount += batch.length
              console.log(`[SYNC] Saved ${savedCount}/${transactionsToAdd.length}`)
            }
          }
        }

        // Get final transaction count
        const { count: totalTransactions } = await supabase
          .from('amazon_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('amazon_account_id', amazonAccountId)

        console.log(`[SYNC] Total transactions in DB: ${totalTransactions}`)

        // Update completion status
        const now = new Date()
        
        // Get date range for status message
        const { data: oldestTx } = await supabase
          .from('amazon_transactions')
          .select('transaction_date')
          .eq('amazon_account_id', amazonAccountId)
          .order('transaction_date', { ascending: true })
          .limit(1)
          .single()
        
        const { data: newestTx } = await supabase
          .from('amazon_transactions')
          .select('transaction_date')
          .eq('amazon_account_id', amazonAccountId)
          .order('transaction_date', { ascending: false })
          .limit(1)
          .single()
        
        let statusMessage = `✓ Sync complete! ${totalTransactions} total transactions`
        let daysOfHistory = 0
        
        if (oldestTx?.transaction_date && newestTx?.transaction_date) {
          const oldestDate = new Date(oldestTx.transaction_date)
          const newestDate = new Date(newestTx.transaction_date)
          daysOfHistory = Math.floor((newestDate.getTime() - oldestDate.getTime()) / (24 * 60 * 60 * 1000))
          
          // Format dates for display
          const oldestDateStr = oldestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          const newestDateStr = newestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          
          if (syncMode === 'backfill' && daysOfHistory < 365) {
            statusMessage = `⏳ Backfilling: ${daysOfHistory} days (${oldestDateStr} - ${newestDateStr}) | ${totalTransactions} transactions | Target: 365 days`
          } else {
            statusMessage = `✓ ${daysOfHistory} days synced (${oldestDateStr} - ${newestDateStr}) | ${totalTransactions} transactions`
          }
        }
        
        await supabase
          .from('amazon_accounts')
          .update({
            last_sync: now.toISOString(),
            transaction_count: totalTransactions || 0,
            sync_status: 'idle',
            sync_progress: syncMode === 'backfill' && daysOfHistory < 365 ? Math.floor((daysOfHistory / 365) * 100) : 100,
            sync_message: statusMessage,
            last_sync_error: null,
            updated_at: now.toISOString()
          })
          .eq('id', amazonAccountId)

        console.log(`[SYNC] ✓ Complete - ${totalTransactions} transactions across ${daysOfHistory} days`)

      } catch (error) {
        console.error('[SYNC] Error:', error)
        await supabase
          .from('amazon_accounts')
          .update({ 
            sync_status: 'error',
            sync_progress: 0,
            sync_message: 'Sync failed - check logs',
            last_sync_error: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', amazonAccountId)
      }
    }

    // Start background task
    // @ts-ignore
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(syncTask())
      console.log('[SYNC] Background task dispatched')
    } else {
      syncTask().catch(err => console.error('[SYNC] Background error:', err))
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync started',
        accountId: amazonAccountId
      }),
      { 
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[SYNC] Fatal error:', error)
    
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
