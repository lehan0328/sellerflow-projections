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

    // Fetch Amazon account details
    const { data: amazonAccount, error: accountError } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('id', amazonAccountId)
      .single()

    if (accountError || !amazonAccount) {
      console.error('[SYNC] Account not found:', accountError)
      return new Response(
        JSON.stringify({ error: 'Amazon account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[SYNC] Account found:', amazonAccount.account_name)

    // Check for rate limiting
    if (amazonAccount.rate_limited_until) {
      const rateLimitExpiry = new Date(amazonAccount.rate_limited_until)
      const now = new Date()
      if (rateLimitExpiry > now) {
        const waitSeconds = Math.ceil((rateLimitExpiry.getTime() - now.getTime()) / 1000)
        console.log(`[SYNC] Rate limited. Wait ${waitSeconds}s`)
        return new Response(
          JSON.stringify({ 
            error: 'Rate limited', 
            waitSeconds,
            message: `Rate limited by Amazon. Please wait ${waitSeconds} seconds.`
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Set initial sync status
    console.log('[SYNC] Setting status to syncing...')
    await supabase
      .from('amazon_accounts')
      .update({ 
        sync_status: 'syncing', 
        sync_progress: 0,
        sync_message: 'Starting sync...',
        last_sync_error: null 
      })
      .eq('id', amazonAccountId)

    // Start background sync task
    console.log('[SYNC] Background task dispatched')
    syncAmazonData(supabase, amazonAccount, actualUserId)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Sync started in background' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[SYNC] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function syncAmazonData(supabase: any, amazonAccount: any, actualUserId: string) {
  const amazonAccountId = amazonAccount.id
  
  try {
    console.log('[SYNC] Background task started')
    
    // Get marketplace region
    const region = MARKETPLACE_REGIONS[amazonAccount.marketplace_id] || 'US'
    const apiEndpoint = AMAZON_SPAPI_ENDPOINTS[region]
    console.log('[SYNC] Marketplace:', amazonAccount.marketplace_name)
    console.log('[SYNC] Seller ID:', amazonAccount.seller_id)

    // Refresh access token if needed
    console.log('[SYNC] Checking access token...')
    const tokenExpiresAt = new Date(amazonAccount.token_expires_at || 0)
    const now = new Date()
    let accessToken = amazonAccount.encrypted_access_token

    if (tokenExpiresAt <= now || !accessToken) {
      console.log('[SYNC] Refreshing token...')
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke('refresh-amazon-token', {
        body: { amazon_account_id: amazonAccountId }
      })

      if (refreshError) {
        throw new Error(`Token refresh failed: ${refreshError.message}`)
      }

      accessToken = refreshData.access_token
      console.log('[SYNC] Token refreshed successfully')
    }

    console.log('[SYNC] Using endpoint:', apiEndpoint)

    // Determine sync window based on last_synced_to
    let startDate: Date
    let endDate: Date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999)

    if (amazonAccount.last_synced_to) {
      // Continue from last successful sync
      startDate = new Date(amazonAccount.last_synced_to)
      startDate.setDate(startDate.getDate() + 1)
      startDate.setHours(0, 0, 0, 0)
      
      // Sync one day at a time
      endDate = new Date(startDate)
      endDate.setHours(23, 59, 59, 999)
      
      console.log('[SYNC] Incremental mode - fetching from:', startDate.toISOString())
    } else {
      // First sync - start from 90 days ago
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)
      startDate.setHours(0, 0, 0, 0)
      
      endDate = new Date(startDate)
      endDate.setHours(23, 59, 59, 999)
      
      console.log('[SYNC] Initial sync - starting from:', startDate.toISOString())
    }

    // Don't sync future dates
    if (startDate > yesterday) {
      console.log('[SYNC] Already caught up to yesterday')
      await supabase
        .from('amazon_accounts')
        .update({ 
          sync_status: 'idle',
          sync_progress: 100,
          sync_message: 'Synced',
          last_sync: new Date().toISOString()
        })
        .eq('id', amazonAccountId)
      return
    }

    // Cap end date to yesterday
    if (endDate > yesterday) {
      endDate = new Date(yesterday)
    }

    await supabase
      .from('amazon_accounts')
      .update({ 
        sync_message: `Syncing ${startDate.toLocaleDateString()}...`
      })
      .eq('id', amazonAccountId)

    // Fetch transactions for this day
    const financialEventsUrl = `${apiEndpoint}/finances/v0/financialEvents`
    const transactionsToAdd: any[] = []
    const payoutsToAdd: any[] = []
    let nextToken: string | undefined = amazonAccount.sync_next_token || undefined
    let pageCount = 0
    
    console.log('[SYNC] Starting pagination for 1-day window...')
    console.log('[SYNC] Fetching: ', `${startDate.toISOString()} to ${endDate.toISOString()}`)

    do {
      pageCount++
      
      if (pageCount % 5 === 0) {
        console.log(`[SYNC] Page ${pageCount} (${transactionsToAdd.length} transactions so far)`)
        await supabase
          .from('amazon_accounts')
          .update({ 
            sync_progress: Math.min(10 + pageCount * 2, 85),
            sync_message: `Fetching page ${pageCount}...`
          })
          .eq('id', amazonAccountId)
      }

      // Build URL
      let url = `${financialEventsUrl}?PostedAfter=${startDate.toISOString()}&PostedBefore=${endDate.toISOString()}&MarketplaceId=${amazonAccount.marketplace_id}&MaxResultsPerPage=100`
      
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
            // Set rate limit timer
            const rateLimitUntil = new Date(Date.now() + (60 * 1000)) // 1 minute
            await supabase
              .from('amazon_accounts')
              .update({ 
                rate_limited_until: rateLimitUntil.toISOString(),
                sync_status: 'rate_limited',
                sync_message: `Rate limited. Wait 60s`,
                sync_next_token: nextToken // Save token to resume later
              })
              .eq('id', amazonAccountId)
            
            throw new Error(`Rate limited by Amazon. Will retry automatically.`)
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
          
          // Handle TTL expiration specifically - reset token and continue with next date
          if (errorText.includes('Time to live') || errorText.includes('TTL exceeded')) {
            console.log('[SYNC] NextToken expired - resetting and moving to next date')
            
            // Clear the expired token
            await supabase
              .from('amazon_accounts')
              .update({ 
                sync_next_token: null,
                last_synced_to: endDate.toISOString(), // Mark this date as done
                sync_message: 'Token expired - continuing next date...'
              })
              .eq('id', amazonAccountId)
            
            // Break out of pagination loop to move to next date
            nextToken = undefined
            break
          }
          
          throw new Error(`API failed: ${response.status} - ${errorText}`)
        }
        
        break // Success - exit retry loop
      }

      const data = await response.json()
      nextToken = data.payload?.NextToken
      
      // Save nextToken for resumption
      if (nextToken) {
        await supabase
          .from('amazon_accounts')
          .update({ sync_next_token: nextToken })
          .eq('id', amazonAccountId)
      }

      // Process events
      const events = data.payload?.FinancialEvents || {}
      
      console.log('[SYNC] Event counts:', {
        shipments: (events.ShipmentEventList || []).length,
        refunds: (events.RefundEventList || []).length,
        adjustments: (events.AdjustmentEventList || []).length,
        settlements: (events.ShipmentSettleEventList || []).length
      })

      // Process settlement events (Payouts)
      for (const settlement of (events.ShipmentSettleEventList || [])) {
        const settlementId = settlement.SettlementId
        const postedDate = settlement.PostedDate
        
        let totalAmount = 0
        let ordersTotal = 0
        let feesTotal = 0
        let refundsTotal = 0
        
        for (const item of (settlement.ShipmentItemList || [])) {
          for (const charge of (item.ItemChargeList || [])) {
            const amount = parseFloat(charge.ChargeAmount?.CurrencyAmount || '0')
            totalAmount += amount
            ordersTotal += amount
          }
          
          for (const fee of (item.ItemFeeList || [])) {
            const feeAmount = parseFloat(fee.FeeAmount?.CurrencyAmount || '0')
            totalAmount += feeAmount
            feesTotal += Math.abs(feeAmount)
          }
        }
        
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

    } while (nextToken)
    
    console.log(`[SYNC] Pagination complete after ${pageCount} pages`)
    console.log(`[SYNC] Extracted: ${transactionsToAdd.length} transactions, ${payoutsToAdd.length} payouts`)

    // Determine if this day's data should go to rollups or detailed transactions
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const isOldData = endDate < thirtyDaysAgo

    if (isOldData && transactionsToAdd.length > 0) {
      // Aggregate into daily rollups
      console.log('[SYNC] Data is >30 days old - aggregating into rollups')
      
      const rollup = {
        user_id: actualUserId,
        account_id: amazonAccount.account_id,
        amazon_account_id: amazonAccountId,
        rollup_date: startDate.toISOString().split('T')[0],
        total_orders: 0,
        total_revenue: 0,
        total_fees: 0,
        total_refunds: 0,
        total_net: 0,
        order_count: 0,
        refund_count: 0,
        adjustment_count: 0,
        fee_count: 0,
        currency_code: transactionsToAdd[0]?.currency_code || 'USD',
        marketplace_name: amazonAccount.marketplace_name
      }

      for (const tx of transactionsToAdd) {
        if (tx.transaction_type === 'Order') {
          rollup.order_count++
          rollup.total_revenue += parseFloat(tx.amount || 0)
        } else if (tx.transaction_type === 'Refund') {
          rollup.refund_count++
          rollup.total_refunds += parseFloat(tx.amount || 0)
        }
        rollup.total_net += parseFloat(tx.amount || 0)
      }

      await supabase
        .from('amazon_daily_rollups')
        .upsert(rollup, { onConflict: 'amazon_account_id,rollup_date' })

      console.log('[SYNC] ✓ Saved daily rollup')
    } else {
      // Save detailed transactions
      console.log('[SYNC] Data is <30 days old - saving detailed transactions')
      
      if (transactionsToAdd.length > 0) {
        const uniqueTransactions = transactionsToAdd.reduce((acc, tx) => {
          const key = tx.transaction_id
          if (!acc.has(key)) {
            acc.set(key, tx)
          }
          return acc
        }, new Map())
        
        const deduplicatedTransactions = Array.from(uniqueTransactions.values())
        console.log(`[SYNC] Saving ${deduplicatedTransactions.length} unique transactions (${transactionsToAdd.length - deduplicatedTransactions.length} duplicates removed)...`)
        
        // Save in batches of 100
        const batchSize = 100
        for (let i = 0; i < deduplicatedTransactions.length; i += batchSize) {
          const batch = deduplicatedTransactions.slice(i, i + batchSize)
          const { error: txError } = await supabase
            .from('amazon_transactions')
            .upsert(batch, { onConflict: 'transaction_id', ignoreDuplicates: true })
          
          if (txError) {
            console.error('[SYNC] Transaction insert error:', txError)
          } else {
            console.log(`[SYNC] Saved ${Math.min(i + batchSize, deduplicatedTransactions.length)}/${deduplicatedTransactions.length}`)
          }
        }
      }
    }

    // Save payouts
    if (payoutsToAdd.length > 0) {
      const uniquePayouts = payoutsToAdd.reduce((acc, payout) => {
        const key = payout.settlement_id
        if (!acc.has(key)) {
          acc.set(key, payout)
        }
        return acc
      }, new Map())
      
      const deduplicatedPayouts = Array.from(uniquePayouts.values())
      
      const { error: payoutError } = await supabase
        .from('amazon_payouts')
        .upsert(deduplicatedPayouts, { onConflict: 'settlement_id' })
      
      if (!payoutError) {
        console.log(`[SYNC] ✓ Saved ${deduplicatedPayouts.length} payouts`)
      }
    }

    // Mark this day as complete and clear next_token
    await supabase
      .from('amazon_accounts')
      .update({ 
        last_synced_to: endDate.toISOString(),
        sync_next_token: null,
        last_sync: new Date().toISOString()
      })
      .eq('id', amazonAccountId)

    // Check if we're fully caught up
    if (endDate >= yesterday) {
      console.log('[SYNC] ✓ Fully caught up!')
      await supabase
        .from('amazon_accounts')
        .update({ 
          sync_status: 'idle',
          sync_progress: 100,
          sync_message: 'Synced',
          initial_sync_complete: true
        })
        .eq('id', amazonAccountId)
    } else {
      // Continue syncing next day
      console.log('[SYNC] More days to sync - will continue...')
      await supabase
        .from('amazon_accounts')
        .update({ 
          sync_status: 'idle',
          sync_progress: 50,
          sync_message: 'In progress - more data to sync'
        })
        .eq('id', amazonAccountId)
      
      // Trigger next day sync
      setTimeout(() => {
        syncAmazonData(supabase, amazonAccount, actualUserId)
      }, 2000)
    }

  } catch (error) {
    console.error('[SYNC] Error in background task:', error)
    const errorMessage = error.message || String(error)
    
    // For TTL expiration, try to continue with next sync automatically
    if (errorMessage.includes('Time to live') || errorMessage.includes('TTL exceeded')) {
      console.log('[SYNC] TTL error - clearing token and will retry automatically')
      await supabase
        .from('amazon_accounts')
        .update({ 
          sync_status: 'idle',
          sync_next_token: null,
          sync_message: 'Sync paused - will auto-retry',
          last_sync_error: 'Token expired during sync - will resume automatically'
        })
        .eq('id', amazonAccountId)
      
      // Auto-retry in 5 seconds with fresh token
      setTimeout(() => {
        console.log('[SYNC] Auto-retrying after TTL expiration')
        syncAmazonData(supabase, amazonAccount, actualUserId)
      }, 5000)
    } else {
      await supabase
        .from('amazon_accounts')
        .update({ 
          sync_status: 'error',
          sync_message: errorMessage.substring(0, 200),
          last_sync_error: errorMessage.substring(0, 500)
        })
        .eq('id', amazonAccountId)
    }
  }
}
