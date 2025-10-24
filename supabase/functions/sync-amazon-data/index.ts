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
        
        // Use incremental sync
        const startDate = new Date()
        if (amazonAccount.last_sync && amazonAccount.initial_sync_complete) {
          startDate.setTime(new Date(amazonAccount.last_sync).getTime() - (24 * 60 * 60 * 1000))
          console.log('[SYNC] Incremental sync from:', startDate.toISOString())
        } else {
          // Initial: last 30 days
          startDate.setDate(startDate.getDate() - 30)
          console.log('[SYNC] Initial sync - last 30 days from:', startDate.toISOString())
        }

        const transactionsToAdd: any[] = []
        let nextToken: string | undefined = undefined
        let pageCount = 0
        const maxPages = 5 // Limit to ~450-500 transactions per sync (5 pages × 100 per page)
        
        console.log('[SYNC] Starting pagination (max 5 pages per sync)...')

        do {
          pageCount++
          console.log(`[SYNC] Page ${pageCount}/${maxPages} (${transactionsToAdd.length} transactions)`)
          
          // Update progress every 2 pages
          if (pageCount % 2 === 0) {
            const progressPercentage = Math.min(15 + (pageCount / maxPages) * 70, 85)
            await supabase
              .from('amazon_accounts')
              .update({ 
                sync_progress: Math.round(progressPercentage),
                sync_message: `Fetching page ${pageCount}/${maxPages}... ${transactionsToAdd.length} found`
              })
              .eq('id', amazonAccountId)
          }

          // Build URL
          let url = `${financialEventsUrl}?PostedAfter=${startDate.toISOString()}&MarketplaceId=${amazonAccount.marketplace_id}&MaxResultsPerPage=100`
          if (nextToken) {
            url += `&NextToken=${encodeURIComponent(nextToken)}`
          }

          const response = await fetch(url, {
            headers: {
              'x-amz-access-token': accessToken,
              'Content-Type': 'application/json',
            }
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('[SYNC] API error:', errorText)
            throw new Error(`API failed: ${response.status} - ${errorText}`)
          }

          const data = await response.json()
          nextToken = data.payload?.NextToken

          // Process events
          const events = data.payload?.FinancialEvents || {}
          console.log('[SYNC] Event counts:', {
            shipments: (events.ShipmentEventList || []).length,
            refunds: (events.RefundEventList || []).length,
            adjustments: (events.AdjustmentEventList || []).length
          })

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

          // Break if max pages reached
          if (pageCount >= maxPages) {
            console.log(`[SYNC] Reached page limit (${maxPages}). Will continue in next sync (5 min).`)
            break
          }

        } while (nextToken)

        console.log(`[SYNC] Pagination complete. Total transactions: ${transactionsToAdd.length}`)

        // Update progress
        await supabase
          .from('amazon_accounts')
          .update({ 
            sync_progress: 90,
            sync_message: `Saving ${transactionsToAdd.length} transactions...`
          })
          .eq('id', amazonAccountId)

        // Save transactions in batches
        if (transactionsToAdd.length > 0) {
          console.log(`[SYNC] Saving ${transactionsToAdd.length} transactions...`)
          const batchSize = 100
          let savedCount = 0
          
          for (let i = 0; i < transactionsToAdd.length; i += batchSize) {
            const batch = transactionsToAdd.slice(i, i + batchSize)
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
        await supabase
          .from('amazon_accounts')
          .update({
            last_sync: now.toISOString(),
            transaction_count: totalTransactions || 0,
            initial_sync_complete: (totalTransactions || 0) > 0,
            sync_status: 'idle',
            sync_progress: 100,
            sync_message: `✓ Sync complete! ${totalTransactions} total transactions`,
            last_sync_error: null,
            updated_at: now.toISOString()
          })
          .eq('id', amazonAccountId)

        console.log(`[SYNC] ✓ Complete - ${totalTransactions} total transactions`)

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
