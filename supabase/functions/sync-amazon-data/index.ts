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

    // Prevent duplicate syncs - check if already syncing
    if (amazonAccount.sync_status === 'syncing') {
      console.log('[SYNC] Already syncing. Ignoring duplicate request.')
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Sync already in progress. Please wait for it to complete.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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

    // For settlements, always fetch full year for seasonal patterns
    let settlementsStartDate = new Date()
    settlementsStartDate.setDate(settlementsStartDate.getDate() - 365)
    settlementsStartDate.setHours(0, 0, 0, 0)

    if (amazonAccount.last_synced_to) {
      // Continue from last successful sync
      startDate = new Date(amazonAccount.last_synced_to)
      startDate.setDate(startDate.getDate() + 1)
      startDate.setHours(0, 0, 0, 0)
      
      // Instead of one day at a time, fetch 30 days per sync for faster backfill
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 30)
      endDate.setHours(23, 59, 59, 999)
      
      console.log('[SYNC] Incremental mode - fetching 30 days of transactions from:', startDate.toISOString())
    } else {
      // First sync - get last 60 days of detailed transactions
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 60)
      startDate.setHours(0, 0, 0, 0)
      
      // Fetch all 60 days in one go for initial sync
      endDate = new Date()
      endDate.setHours(23, 59, 59, 999)
      
      console.log('[SYNC] Initial sync - fetching 60 days of transactions:', startDate.toISOString(), 'to', endDate.toISOString())
    }

    console.log('[SYNC] Settlements window: Full year (365 days) for seasonal analysis')

    // Don't sync future dates - cap to yesterday
    if (startDate > yesterday) {
      console.log('[SYNC] Already caught up to yesterday')
      await supabase
        .from('amazon_accounts')
        .update({ 
          sync_status: 'idle',
          sync_progress: 100,
          sync_message: 'Synced',
          last_sync: new Date().toISOString(),
          initial_sync_complete: true
        })
        .eq('id', amazonAccountId)
      return
    }

    // Cap end date to yesterday
    if (endDate > yesterday) {
      endDate = new Date(yesterday)
    }
    
    // Log sync window clearly
    console.log(`[SYNC] Sync window: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    await supabase
      .from('amazon_accounts')
      .update({ 
        sync_message: `Syncing ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`,
        sync_progress: Math.min(5, (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24) * 0.5)
      })
      .eq('id', amazonAccountId)

    // First, fetch settlement groups (actual payouts) - ALWAYS fetch full year for seasonal patterns
    const eventGroupsUrl = `${apiEndpoint}/finances/v0/financialEventGroups`
    const settlementsToAdd: any[] = []
    
    console.log('[SYNC] Fetching settlement groups (full year for seasonal patterns)...')
    let groupNextToken: string | undefined = undefined
    let groupPageCount = 0
    
    do {
      groupPageCount++
      // Use settlementsStartDate (365 days) for settlements, not startDate
      let groupUrl = `${eventGroupsUrl}?FinancialEventGroupStartedAfter=${settlementsStartDate.toISOString()}&FinancialEventGroupStartedBefore=${yesterday.toISOString()}&MaxResultsPerPage=100`
      
      if (groupNextToken) {
        groupUrl += `&NextToken=${encodeURIComponent(groupNextToken)}`
      }
      
      console.log(`[SYNC] Fetching settlement groups page ${groupPageCount}...`)
      
      const groupResponse = await fetch(groupUrl, {
        headers: {
          'x-amz-access-token': accessToken,
          'Content-Type': 'application/json',
        }
      })
      
      if (!groupResponse.ok) {
        const errorText = await groupResponse.text()
        console.error('[SYNC] Settlement groups API error:', errorText)
        break
      }
      
      const groupData = await groupResponse.json()
      const groups = groupData.payload?.FinancialEventGroupList || []
      groupNextToken = groupData.payload?.NextToken
      
      console.log(`[SYNC] Found ${groups.length} settlement groups`)
      
      for (const group of groups) {
        const settlementId = group.FinancialEventGroupId
        const startDate = group.FinancialEventGroupStart
        let endDate = group.FinancialEventGroupEnd
        const processingStatus = group.ProcessingStatus
        const fundTransferStatus = group.FundTransferStatus
        
        // For open settlements without endDate, calculate it based on payout frequency
        if (!endDate && processingStatus === 'Open') {
          const start = new Date(startDate);
          if (amazonAccount.payout_frequency === 'bi-weekly' || amazonAccount.payout_model === 'bi-weekly') {
            // Bi-weekly settlements close 14 days after start
            start.setDate(start.getDate() + 14);
            endDate = start.toISOString().split('T')[0];
            console.log(`[SYNC] Calculated end date for open bi-weekly settlement: ${startDate} -> ${endDate}`);
          } else if (amazonAccount.payout_frequency === 'daily' || amazonAccount.payout_model === 'daily') {
            // Daily payouts close same day
            endDate = startDate;
          }
        }
        
        // Process both Closed (confirmed) and Open (estimated) settlements from Amazon
        if (group.OriginalTotal) {
          const totalAmount = parseFloat(group.OriginalTotal?.CurrencyAmount || '0')
          const currencyCode = group.OriginalTotal?.CurrencyCode || 'USD'
          
          // Determine status based on Amazon's processing status
          let settlementStatus = 'estimated';
          if (processingStatus === 'Closed') {
            settlementStatus = 'confirmed';
          } else if (processingStatus === 'Open') {
            settlementStatus = 'estimated'; // Amazon's pending settlement
          }
          
          settlementsToAdd.push({
            user_id: actualUserId,
            account_id: amazonAccount.account_id,
            amazon_account_id: amazonAccountId,
            settlement_id: settlementId,
            payout_date: endDate || startDate,
            total_amount: totalAmount,
            orders_total: totalAmount, // Will be broken down from events
            fees_total: 0,
            refunds_total: 0,
            currency_code: currencyCode,
            status: settlementStatus,
            payout_type: amazonAccount.payout_frequency || 'bi-weekly',
            marketplace_name: amazonAccount.marketplace_name,
            raw_settlement_data: group
          })
        }
      }
      
      // Rate limiting delay between pages
      if (groupNextToken) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
    } while (groupNextToken && groupPageCount < 50)
    
    console.log(`[SYNC] Found ${settlementsToAdd.length} settlements from groups`)
    
    // Now fetch transactions for this day
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
        
        // Handle non-OK responses
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
            
            // Break out of BOTH loops - skip JSON parsing
            nextToken = undefined
            break
          }
          
          throw new Error(`API failed: ${response.status} - ${errorText}`)
        }
        
        break // Success - exit retry loop
      }

      // Skip JSON parsing if response body was already consumed (e.g., in TTL error handling)
      // Check if we exited due to TTL error
      if (!nextToken && !response.ok) {
        break // Exit pagination loop without parsing
      }

      // Parse JSON only for successful responses
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
          marketplace_name: amazonAccount.marketplace_name,
          raw_settlement_data: settlement
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

      // Rate limiting delay between transaction pages - prevent Amazon throttling
      if (nextToken) {
        await new Promise(resolve => setTimeout(resolve, 500)) // 0.5 second delay
      }

    } while (nextToken)
    
    console.log(`[SYNC] Pagination complete after ${pageCount} pages`)
    console.log(`[SYNC] Extracted: ${transactionsToAdd.length} transactions, ${payoutsToAdd.length} payouts from events, ${settlementsToAdd.length} settlements from groups`)

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

    // Save payouts from events
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
        .upsert(deduplicatedPayouts, { 
          onConflict: 'amazon_account_id,settlement_id',
          ignoreDuplicates: false 
        })
      
      if (!payoutError) {
        console.log(`[SYNC] ✓ Saved ${deduplicatedPayouts.length} payouts from events`)
      }
    }
    
    // Save settlements from groups
    if (settlementsToAdd.length > 0) {
      const uniqueSettlements = settlementsToAdd.reduce((acc, settlement) => {
        const key = settlement.settlement_id
        if (!acc.has(key)) {
          acc.set(key, settlement)
        }
        return acc
      }, new Map())
      
      const deduplicatedSettlements = Array.from(uniqueSettlements.values())
      
      // Delete any forecasted payouts that overlap with real settlements
      const settlementDates = deduplicatedSettlements.map(s => s.payout_date)
      if (settlementDates.length > 0) {
        await supabase
          .from('amazon_payouts')
          .delete()
          .eq('amazon_account_id', amazonAccountId)
          .eq('status', 'forecasted')
          .in('payout_date', settlementDates)
        
        console.log(`[SYNC] Cleared forecasted payouts for ${settlementDates.length} settlement dates`)
      }
      
      const { error: settlementError } = await supabase
        .from('amazon_payouts')
        .upsert(deduplicatedSettlements, { 
          onConflict: 'amazon_account_id,settlement_id',
          ignoreDuplicates: false 
        })
      
      if (settlementError) {
        console.error('[SYNC] Settlement insert error:', settlementError)
      } else {
        console.log(`[SYNC] ✓ Saved ${deduplicatedSettlements.length} settlements from groups`)
      }
    }

    // Get updated transaction count from both tables
    const { count: recentTransactionCount } = await supabase
      .from('amazon_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('amazon_account_id', amazonAccountId)

    const { data: rollupData } = await supabase
      .from('amazon_daily_rollups')
      .select('order_count, refund_count')
      .eq('amazon_account_id', amazonAccountId)

    const rollupTransactionCount = rollupData?.reduce((sum, row) => 
      sum + (row.order_count || 0) + (row.refund_count || 0), 0
    ) || 0

    const totalTransactionCount = (recentTransactionCount || 0) + rollupTransactionCount

    console.log(`[SYNC] Transaction count: ${recentTransactionCount} recent + ${rollupTransactionCount} rollups = ${totalTransactionCount} total`)

    // Detect payout frequency based on CONFIRMED settlement dates only
    const { data: confirmedSettlements } = await supabase
      .from('amazon_payouts')
      .select('payout_date, status')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'confirmed')  // Only use actual confirmed settlements
      .order('payout_date', { ascending: true })
      .limit(30)

    if (confirmedSettlements && confirmedSettlements.length >= 2) {
      // Get unique dates (some dates may have multiple settlements due to adjustments)
      const uniqueDates = [...new Set(confirmedSettlements.map(p => p.payout_date))]
        .map(date => new Date(date))
        .sort((a, b) => a.getTime() - b.getTime())
      
      // Calculate days between consecutive unique settlement dates
      const daysBetween: number[] = []
      for (let i = 1; i < uniqueDates.length; i++) {
        const diff = (uniqueDates[i].getTime() - uniqueDates[i-1].getTime()) / (1000 * 60 * 60 * 24)
        daysBetween.push(diff)
      }
      
      // Find the most common interval (mode) to identify the payout pattern
      const intervalCounts = daysBetween.reduce((acc, days) => {
        // Round to nearest day and group similar intervals (13-15 days = bi-weekly)
        const roundedDays = Math.round(days)
        const key = roundedDays >= 13 && roundedDays <= 15 ? 14 : roundedDays
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<number, number>)
      
      // Get the most common interval
      const mostCommonInterval = Object.entries(intervalCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0]
      
      const avgDaysBetween = daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length
      
      console.log(`[SYNC] Payout frequency analysis:`, {
        totalSettlements: confirmedSettlements.length,
        uniqueDates: uniqueDates.length,
        mostCommonInterval: `${mostCommonInterval} days (${intervalCounts[mostCommonInterval]} times)`,
        avgInterval: `${avgDaysBetween.toFixed(1)} days`,
        allIntervals: intervalCounts
      })
      
      // If the most common interval is 14 days, or if there are multiple settlements ~14 days apart, it's bi-weekly
      const biWeeklyCount = intervalCounts[14] || 0
      const hasBiWeeklyPattern = biWeeklyCount >= 2 || mostCommonInterval === '14'
      const isBiWeekly = hasBiWeeklyPattern
      const payoutFreq = isBiWeekly ? 'bi-weekly' : 'daily'
      
      if (!isBiWeekly !== amazonAccount.uses_daily_payouts || payoutFreq !== amazonAccount.payout_frequency) {
        console.log(`[SYNC] Updating payout model to: ${payoutFreq}`)
        await supabase
          .from('amazon_accounts')
          .update({ 
            uses_daily_payouts: !isBiWeekly,
            payout_frequency: payoutFreq,
            payout_model: payoutFreq
          })
          .eq('id', amazonAccountId)
      }
    } else if (confirmedSettlements && confirmedSettlements.length === 1) {
      // With only 1 settlement, check if there's an open settlement coming
      const { data: estimatedSettlements } = await supabase
        .from('amazon_payouts')
        .select('payout_date')
        .eq('amazon_account_id', amazonAccountId)
        .eq('status', 'estimated')
        .order('payout_date', { ascending: true })
        .limit(1)
      
      if (estimatedSettlements && estimatedSettlements.length > 0) {
        const daysBetween = (new Date(estimatedSettlements[0].payout_date).getTime() - 
                            new Date(confirmedSettlements[0].payout_date).getTime()) / (1000 * 60 * 60 * 24)
        
        const isBiWeekly = daysBetween >= 14
        const payoutFreq = isBiWeekly ? 'bi-weekly' : 'daily'
        
        console.log(`[SYNC] Detected payout frequency from 1 confirmed + 1 estimated: ${daysBetween.toFixed(1)} days -> ${payoutFreq}`)
        
        await supabase
          .from('amazon_accounts')
          .update({ 
            uses_daily_payouts: !isBiWeekly,
            payout_frequency: payoutFreq,
            payout_model: payoutFreq
          })
          .eq('id', amazonAccountId)
      }
    }

    // Mark this day as complete and clear next_token
    // Also mark initial sync as complete if we have enough transactions (50+)
    const updateData: any = { 
      last_synced_to: endDate.toISOString(),
      sync_next_token: null,
      last_sync: new Date().toISOString(),
      transaction_count: totalTransactionCount
    };
    
    // Mark initial sync complete once we have sufficient data
    if (totalTransactionCount >= 50 && !amazonAccount.initial_sync_complete) {
      updateData.initial_sync_complete = true;
      console.log('[SYNC] ✓ Initial sync complete - sufficient data collected');
    }
    
    await supabase
      .from('amazon_accounts')
      .update(updateData)
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
      // Mark as ready for next sync (scheduled job will continue)
      console.log('[SYNC] ✓ Batch complete - ready for next sync')
      const daysRemaining = Math.ceil((yesterday.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
      const totalDays = Math.ceil((yesterday.getTime() - new Date(amazonAccount.last_synced_to || startDate).getTime()) / (1000 * 60 * 60 * 24))
      const progress = totalDays > 0 ? Math.min(95, Math.round((1 - (daysRemaining / totalDays)) * 100)) : 5
      
      await supabase
        .from('amazon_accounts')
        .update({ 
          sync_status: 'idle',
          sync_progress: progress,
          sync_message: `Synced through ${endDate.toISOString().split('T')[0]} (${daysRemaining}d remaining)`
        })
        .eq('id', amazonAccountId)
    }

  } catch (error) {
    console.error('[SYNC] Error in background task:', error)
    const errorMessage = error.message || String(error)
    
    // For TTL expiration, clear token and let next sync retry
    if (errorMessage.includes('Time to live') || errorMessage.includes('TTL exceeded')) {
      console.log('[SYNC] TTL error - clearing token, will retry on next sync')
      await supabase
        .from('amazon_accounts')
        .update({ 
          sync_status: 'idle',
          sync_next_token: null,
          sync_message: 'Ready for next sync',
          last_sync_error: null
        })
        .eq('id', amazonAccountId)
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
