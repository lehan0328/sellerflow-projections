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

// Background sync function that can run without HTTP timeout
async function performBackgroundSync(
  amazonAccountId: string,
  userId: string,
  supabase: any
) {
  try {
    console.log(`[BACKGROUND] Starting sync - Account: ${amazonAccountId}, User: ${userId}`)
    const actualUserId = userId

    // Fetch Amazon account details
    const { data: amazonAccount, error: accountError } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('id', amazonAccountId)
      .single()

    if (accountError || !amazonAccount) {
      console.error('[BACKGROUND] Account not found:', accountError)
      return
    }

    console.log('[BACKGROUND] Account found:', amazonAccount.account_name)

    // Check for rate limiting
    let now = new Date()
    if (amazonAccount.rate_limited_until) {
      const rateLimitExpiry = new Date(amazonAccount.rate_limited_until)
      if (rateLimitExpiry > now) {
        const waitSeconds = Math.ceil((rateLimitExpiry.getTime() - now.getTime()) / 1000)
        console.log(`[BACKGROUND] Rate limited. Wait ${waitSeconds}s`)
        return
      }
    }

    // Prevent duplicate syncs
    if (amazonAccount.sync_status === 'syncing') {
      console.log('[BACKGROUND] Already syncing, skipping')
      return
    }

    // Set initial sync status
    console.log('[BACKGROUND] Setting status to syncing...')
    await supabase
      .from('amazon_accounts')
      .update({ 
        sync_status: 'syncing', 
        sync_progress: 0,
        sync_message: 'Starting sync...',
        last_sync_error: null 
      })
      .eq('id', amazonAccountId)

    // Perform the actual sync
    await syncAmazonData(supabase, amazonAccount, actualUserId)

  } catch (error) {
    console.error('[BACKGROUND] Error:', error)
    await supabase
      .from('amazon_accounts')
      .update({ 
        sync_status: 'error',
        sync_message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`.substring(0, 200),
        last_sync_error: error instanceof Error ? error.message.substring(0, 500) : 'Unknown error'
      })
      .eq('id', amazonAccountId)
  }
}

async function syncAmazonData(supabase: any, amazonAccount: any, actualUserId: string) {
  const amazonAccountId = amazonAccount.id
  const syncStartTime = Date.now() // Track sync start time for timeout
  
  try {
    console.log('[SYNC] Background task started at:', new Date().toISOString())
    
    // Get marketplace region
    const region = MARKETPLACE_REGIONS[amazonAccount.marketplace_id] || 'US'
    const apiEndpoint = AMAZON_SPAPI_ENDPOINTS[region]
    console.log('[SYNC] Marketplace:', amazonAccount.marketplace_name)
    console.log('[SYNC] Seller ID:', amazonAccount.seller_id)

    // Refresh access token if needed
    console.log('[SYNC] Checking access token...')
    const tokenExpiresAt = new Date(amazonAccount.token_expires_at || 0)
    let now = new Date()
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

    // For settlements, always fetch full year for seasonal patterns (365 days BACK)
    let settlementsStartDate = new Date()
    settlementsStartDate.setDate(settlementsStartDate.getDate() - 365)
    settlementsStartDate.setHours(0, 0, 0, 0)

    const nowForSettlements = new Date()
    nowForSettlements.setMinutes(nowForSettlements.getMinutes() - 5) // Amazon requires date to be no later than 2 minutes from now
    
    // Define the target historical window (90 days BACK from today)
    const transactionStartDate = new Date()
    transactionStartDate.setDate(transactionStartDate.getDate() - 90) // 90 days for standard sync
    transactionStartDate.setHours(0, 0, 0, 0)

    // Check if last_synced_to is valid and in the past
    const lastSyncDate = amazonAccount.last_synced_to ? new Date(amazonAccount.last_synced_to) : null
    const isLastSyncInFuture = lastSyncDate && lastSyncDate >= yesterday
    
    // CRITICAL: If we have a continuation token, we're still paginating the SAME date range
    if (amazonAccount.sync_next_token && lastSyncDate) {
      // Continue paginating the same day we were on
      startDate = new Date(lastSyncDate)
      // For continuation, use the same date we were syncing (NOT +1 day)
      endDate = new Date(lastSyncDate)
      endDate.setDate(endDate.getDate() + 1)
      
      console.log('[SYNC] 🔄 CONTINUATION - same date range:', startDate.toISOString(), 'to', endDate.toISOString(), '(has nextToken)')
    } else if (!lastSyncDate || isLastSyncInFuture) {
      // First sync OR last_synced_to is today/future (invalid) - fetch last 90 days
      startDate = new Date(transactionStartDate)
      endDate = new Date(yesterday)
      
      console.log('[SYNC] Initial/Reset sync - fetching 90 days of historical transactions:', startDate.toISOString(), 'to', endDate.toISOString())
    } else if (lastSyncDate < transactionStartDate) {
      // Last sync was more than 90 days ago - resume from where we left off
      startDate = new Date(lastSyncDate)
      startDate.setDate(startDate.getDate() + 1)
      startDate.setHours(0, 0, 0, 0)
      
      // Fetch 1 day at a time for backfill (optimized for high-volume accounts)
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)
      
      // Don't go beyond yesterday
      if (endDate > yesterday) {
        endDate = new Date(yesterday)
      }
      
      console.log('[SYNC] Backfill mode - continuing from:', startDate.toISOString(), 'to', endDate.toISOString())
    } else {
      // Last sync was within the 90-day window - continue incrementally
      startDate = new Date(lastSyncDate)
      startDate.setDate(startDate.getDate() + 1)
      startDate.setHours(0, 0, 0, 0)
      
      // Fetch 1 day at a time (optimized for high-volume accounts)
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)
      
      // Don't go beyond yesterday
      if (endDate > yesterday) {
        endDate = new Date(yesterday)
      }
      
      // Only proceed if startDate is before yesterday (not trying to sync future)
      if (startDate >= yesterday) {
        console.log('[SYNC] Already up to date - no new transactions to sync')
        // Update last_sync timestamp but don't fetch
        await supabase
          .from('amazon_accounts')
          .update({ 
            last_sync: new Date().toISOString(),
            sync_status: 'idle'
          })
          .eq('id', amazonAccountId)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Account already up to date',
            settlementCount: 0,
            transactionCount: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log('[SYNC] Incremental mode - fetching new transactions from:', startDate.toISOString(), 'to', endDate.toISOString())
    }

    console.log('[SYNC] Settlements window: Full year (365 days) for seasonal analysis')

    // First, fetch settlement groups (actual payouts) - ALWAYS fetch full year for seasonal patterns
    // This runs regardless of transaction sync status to capture open settlements
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
        
        // Use the settlement close date as the payout date
        let payoutDate = endDate || startDate;
        
        // Process both Closed (confirmed) and Open (estimated) settlements from Amazon
        let totalAmount = parseFloat(group.OriginalTotal?.CurrencyAmount || '0')
        const currencyCode = group.OriginalTotal?.CurrencyCode || 'USD'
        
        // For open settlements, use AccumulatingBalance if OriginalTotal is not available
        if (processingStatus === 'Open' && totalAmount === 0 && group.AccumulatingBalance) {
          totalAmount = parseFloat(group.AccumulatingBalance.CurrencyAmount || '0');
          console.log(`[SYNC] Open settlement ${settlementId} using AccumulatingBalance: $${totalAmount.toFixed(2)}`);
        }
        
        // Determine status based on Amazon's processing status
        let settlementStatus = 'estimated';
        if (processingStatus === 'Closed') {
          settlementStatus = 'confirmed';
        } else if (processingStatus === 'Open') {
          settlementStatus = 'estimated'; // Amazon's pending settlement
        }
        
        console.log(`[SYNC] Settlement ${settlementId}: closes ${endDate || startDate}, pays ${payoutDate} (status: ${settlementStatus}, amount: $${totalAmount.toFixed(2)})`);
        
        settlementsToAdd.push({
          user_id: actualUserId,
          account_id: amazonAccount.account_id,
          amazon_account_id: amazonAccountId,
          settlement_id: settlementId,
          payout_date: payoutDate,
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
      
      // Rate limiting delay between pages (reduced for faster sync)
      if (groupNextToken) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
    } while (groupNextToken && groupPageCount < 100)
    
    console.log(`[SYNC] Found ${settlementsToAdd.length} settlements from groups`)
    
    // Don't sync future transaction dates - cap to yesterday
    if (startDate > yesterday) {
      console.log('[SYNC] Already caught up to yesterday for transactions')
      
      // Still save settlements if we found any
      if (settlementsToAdd.length > 0) {
        console.log(`[SYNC] Saving ${settlementsToAdd.length} settlements...`)
        const { error: settlementsError } = await supabase
          .from('amazon_payouts')
          .upsert(settlementsToAdd, { 
            onConflict: 'settlement_id,user_id',
            ignoreDuplicates: false 
          })
        
        if (settlementsError) {
          console.error('[SYNC] Error saving settlements:', settlementsError)
        } else {
          console.log('[SYNC] Settlements saved successfully')
        }
      }
      
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
    
    // Now fetch transactions for this day
    const financialEventsUrl = `${apiEndpoint}/finances/v0/financialEvents`
    const transactionsToAdd: any[] = []
    const payoutsToAdd: any[] = []
    let nextToken: string | undefined = amazonAccount.sync_next_token || undefined
    let pageCount = 0
    
    console.log('[SYNC] Starting pagination for 1-day window...')
    console.log('[SYNC] Fetching: ', `${startDate.toISOString()} to ${endDate.toISOString()}`)

    // With background tasks, no HTTP timeout - can process unlimited pages
    // But still batch to allow graceful interruption and progress updates
    const MAX_PAGES_PER_RUN = 2000 // ~200k transactions per run
    let totalSavedThisRun = 0 // Track total saved in this run
    
    do {
      pageCount++
      
      // Timeout protection - stop if running too long
      const elapsedTime = Date.now() - syncStartTime
      const MAX_SYNC_DURATION_MS = 3600000 // 1 hour
      if (elapsedTime > MAX_SYNC_DURATION_MS) {
        console.log(`[SYNC] ⏱️ Timeout reached after ${pageCount} pages. Saving progress...`)
        
        // Save any pending transactions
        if (transactionsToAdd.length > 0) {
          const uniqueTransactions = transactionsToAdd.reduce((acc, tx) => {
            const key = tx.transaction_id
            if (!acc.has(key)) {
              acc.set(key, tx)
            }
            return acc
          }, new Map())
          
          const deduplicatedTransactions = Array.from(uniqueTransactions.values())
          const batchSize = 100
          for (let i = 0; i < deduplicatedTransactions.length; i += batchSize) {
            const batch = deduplicatedTransactions.slice(i, i + batchSize)
            await supabase
              .from('amazon_transactions')
              .upsert(batch, { onConflict: 'transaction_id', ignoreDuplicates: true })
          }
        }
        
        // Update status and save token for continuation
        await supabase
          .from('amazon_accounts')
          .update({ 
            sync_status: 'idle',
            sync_message: `Timeout after ${pageCount} pages. Will continue next run.`,
            sync_next_token: nextToken,
            last_sync: new Date().toISOString()
          })
          .eq('id', amazonAccountId)
        
        console.log('[SYNC] Progress saved. Sync will continue on next run.')
        return
      }
      
      // Update progress every 3 pages for better visibility
      if (pageCount % 3 === 0) {
        const progressPct = Math.min(10 + (pageCount / MAX_PAGES_PER_RUN) * 75, 85)
        console.log(`[SYNC] Page ${pageCount}/${MAX_PAGES_PER_RUN} (${totalSavedThisRun} saved, ${transactionsToAdd.length} pending)`)
        await supabase
          .from('amazon_accounts')
          .update({ 
            sync_progress: progressPct,
            sync_message: `Page ${pageCount}: ${totalSavedThisRun} saved`
          })
          .eq('id', amazonAccountId)
      }
      
      // Safety: Stop if we've processed too many pages in one run
      if (pageCount >= MAX_PAGES_PER_RUN) {
        console.log(`[SYNC] ⚠️ Reached page limit (${MAX_PAGES_PER_RUN}), saving nextToken for continuation...`)
        
        // Calculate accurate progress based on transaction count
        const { count: totalTransactions } = await supabase
          .from('amazon_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('amazon_account_id', amazonAccountId)
        
        const estimatedTotal = 50000 // Rough estimate for large sellers
        const progressPct = Math.min(Math.floor((totalTransactions || 0) / estimatedTotal * 100), 95)
        
        // Save the nextToken AND the sync window so we can resume from here
        await supabase
          .from('amazon_accounts')
          .update({ 
            sync_next_token: nextToken,
            sync_status: 'idle',
            sync_progress: progressPct,
            sync_message: `Paused: ${totalTransactions} txns (${progressPct}%)`,
            last_sync: new Date().toISOString()
          })
          .eq('id', amazonAccountId)
        console.log(`[SYNC] ✓ Saved continuation token. Cron will resume shortly. Progress: ${progressPct}%`)
        break
      }

      // Build URL
      let url = `${financialEventsUrl}?PostedAfter=${startDate.toISOString()}&PostedBefore=${endDate.toISOString()}&MarketplaceId=${amazonAccount.marketplace_id}&MaxResultsPerPage=100`
      
      if (nextToken) {
        url += `&NextToken=${encodeURIComponent(nextToken)}`
      }
      
      console.log(`[SYNC] ============ API CALL DIAGNOSTIC ============`)
      console.log(`[SYNC] Full URL: ${url}`)
      console.log(`[SYNC] Start Date: ${startDate.toISOString()}`)
      console.log(`[SYNC] End Date: ${endDate.toISOString()}`)
      console.log(`[SYNC] Marketplace ID: ${amazonAccount.marketplace_id}`)
      console.log(`[SYNC] Has NextToken: ${!!nextToken}`)
      console.log(`[SYNC] ============================================`)

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

        console.log(`[SYNC] Response Status: ${response.status} ${response.statusText}`)
        console.log(`[SYNC] Response Headers:`, Object.fromEntries(response.headers.entries()))

        // Handle rate limiting (429) and server errors (503)
        if (response.status === 429 || response.status === 503) {
          retryAttempts++
          if (retryAttempts > maxRetries) {
            // Save any remaining transactions before pausing
            if (transactionsToAdd.length > 0) {
              console.log(`[SYNC] Saving final batch of ${transactionsToAdd.length} transactions before rate limit pause...`)
              
              const uniqueTransactions = transactionsToAdd.reduce((acc, tx) => {
                const key = tx.transaction_id
                if (!acc.has(key)) {
                  acc.set(key, tx)
                }
                return acc
              }, new Map())
              
              const deduplicatedTransactions = Array.from(uniqueTransactions.values())
              
              const batchSize = 100
              for (let i = 0; i < deduplicatedTransactions.length; i += batchSize) {
                const batch = deduplicatedTransactions.slice(i, i + batchSize)
                await supabase
                  .from('amazon_transactions')
                  .upsert(batch, { onConflict: 'transaction_id', ignoreDuplicates: true })
              }
              
              // Update transaction count
              const { count } = await supabase
                .from('amazon_transactions')
                .select('*', { count: 'exact', head: true })
                .eq('amazon_account_id', amazonAccountId)
              
              await supabase
                .from('amazon_accounts')
                .update({ transaction_count: count || 0 })
                .eq('id', amazonAccountId)
              
              console.log('[SYNC] ✓ Final batch saved')
            }
            
            // Set rate limit timer and save progress
            const rateLimitUntil = new Date(Date.now() + (120 * 1000)) // 2 minutes
            await supabase
              .from('amazon_accounts')
              .update({ 
                rate_limited_until: rateLimitUntil.toISOString(),
                sync_status: 'idle',
                sync_message: `Rate limited. Synced ${pageCount} pages. Will auto-resume.`,
                sync_next_token: nextToken, // Save token to resume later
                last_sync: new Date().toISOString()
              })
              .eq('id', amazonAccountId)
            
            console.log(`[SYNC] Rate limited after ${pageCount} pages. Progress saved. Will resume automatically.`)
            return // Exit gracefully, not as error
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
          console.error('[SYNC] ========== API ERROR DETAILS ==========')
          console.error('[SYNC] Status:', response.status)
          console.error('[SYNC] Status Text:', response.statusText)
          console.error('[SYNC] Error Body:', errorText)
          console.error('[SYNC] Request URL:', url)
          console.error('[SYNC] =========================================')
          
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
      
      console.log(`[SYNC] ========== API RESPONSE STRUCTURE ==========`)
      console.log(`[SYNC] Response Keys:`, Object.keys(data))
      console.log(`[SYNC] Payload Keys:`, Object.keys(data.payload || {}))
      console.log(`[SYNC] Has FinancialEvents:`, !!data.payload?.FinancialEvents)
      if (data.payload?.FinancialEvents) {
        console.log(`[SYNC] FinancialEvents Keys:`, Object.keys(data.payload.FinancialEvents))
      }
      console.log(`[SYNC] ==============================================`)
      
      nextToken = data.payload?.NextToken
      console.log(`[SYNC] NextToken present: ${!!nextToken}`)
      
      // Save nextToken for resumption
      if (nextToken) {
        await supabase
          .from('amazon_accounts')
          .update({ sync_next_token: nextToken })
          .eq('id', amazonAccountId)
      }

      // Process events
      const events = data.payload?.FinancialEvents || {}
      
      console.log('[SYNC] ========== EVENT COUNTS ==========')
      console.log('[SYNC] ShipmentEventList:', (events.ShipmentEventList || []).length, 'events')
      console.log('[SYNC] RefundEventList:', (events.RefundEventList || []).length, 'events')
      console.log('[SYNC] AdjustmentEventList:', (events.AdjustmentEventList || []).length, 'events')
      console.log('[SYNC] ShipmentSettleEventList:', (events.ShipmentSettleEventList || []).length, 'events')
      console.log('[SYNC] ServiceFeeEventList:', (events.ServiceFeeEventList || []).length, 'events')
      console.log('[SYNC] ====================================')
      
      // Log sample data if available
      if (events.ShipmentEventList && events.ShipmentEventList.length > 0) {
        console.log('[SYNC] Sample Shipment Event:', JSON.stringify(events.ShipmentEventList[0], null, 2))
      }

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

      // Save transactions in batches every 50 to avoid losing data (more frequent for high-volume)
      if (transactionsToAdd.length >= 50) {
        console.log(`[SYNC] Saving batch of ${transactionsToAdd.length} transactions...`)
        
        const uniqueTransactions = transactionsToAdd.reduce((acc, tx) => {
          const key = tx.transaction_id
          if (!acc.has(key)) {
            acc.set(key, tx)
          }
          return acc
        }, new Map())
        
        const deduplicatedTransactions = Array.from(uniqueTransactions.values())
        
        const batchSize = 100
        for (let i = 0; i < deduplicatedTransactions.length; i += batchSize) {
          const batch = deduplicatedTransactions.slice(i, i + batchSize)
          const { error: txError } = await supabase
            .from('amazon_transactions')
            .upsert(batch, { onConflict: 'transaction_id', ignoreDuplicates: true })
          
          if (txError) {
            console.error('[SYNC] Transaction batch save error:', txError)
          } else {
            console.log(`[SYNC] ✓ Saved batch ${Math.floor(i / batchSize) + 1}`)
          }
        }
        
        // Update transaction count and track total saved
        const { count, error: countError } = await supabase
          .from('amazon_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('amazon_account_id', amazonAccountId)
        
        if (countError) {
          console.error('[SYNC] Error counting transactions:', countError)
        }
        
        console.log(`[SYNC] Count query result: ${count}, error: ${countError}`)
        
        // Update the account's transaction count
        const { error: updateError } = await supabase
          .from('amazon_accounts')
          .update({ transaction_count: count || 0 })
          .eq('id', amazonAccountId)
        
        if (updateError) {
          console.error('[SYNC] Error updating transaction count:', updateError)
        }
        
        totalSavedThisRun += deduplicatedTransactions.length
        console.log(`[SYNC] ✓ Batch saved. Total this run: ${totalSavedThisRun}, DB count: ${count || 0}`)
        
        
        // Clear the array
        transactionsToAdd.length = 0
      }

      // Minimal delay between transaction pages (background task = no timeout concern)
      if (nextToken) {
        await new Promise(resolve => setTimeout(resolve, 200)) // 0.2 second delay
      }

    } while (nextToken)
    
    console.log(`[SYNC] ========== SYNC SUMMARY ==========`)
    console.log(`[SYNC] Pages Fetched: ${pageCount}`)
    console.log(`[SYNC] Transactions Extracted: ${transactionsToAdd.length}`)
    console.log(`[SYNC] Payouts from Events: ${payoutsToAdd.length}`)
    console.log(`[SYNC] Settlements from Groups: ${settlementsToAdd.length}`)
    console.log(`[SYNC] Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`)
    console.log(`[SYNC] ====================================`)
    
    // Log first transaction sample if available
    if (transactionsToAdd.length > 0) {
      console.log('[SYNC] Sample Transaction:', JSON.stringify(transactionsToAdd[0], null, 2))
    }

    // Determine if this day's data should go to rollups or detailed transactions
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const isOldData = endDate < ninetyDaysAgo

    if (isOldData && transactionsToAdd.length > 0) {
      // Aggregate into daily rollups
      console.log('[SYNC] Data is >90 days old - aggregating into rollups')
      
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

      const { error: rollupError } = await supabase
        .from('amazon_daily_rollups')
        .upsert(rollup, { onConflict: 'amazon_account_id,rollup_date' })

      if (rollupError) {
        console.error('[SYNC] Rollup insert error:', rollupError)
        await supabase
          .from('amazon_accounts')
          .update({ 
            sync_status: 'error',
            sync_message: `Rollup insert failed: ${rollupError.message}`,
            sync_progress: 0
          })
          .eq('id', amazonAccountId)
        throw new Error(`Failed to insert daily rollup: ${rollupError.message}`)
      }
      
      console.log('[SYNC] ✓ Saved daily rollup')
    } else {
      // Save detailed transactions
      console.log('[SYNC] Data is <90 days old - saving detailed transactions')
      
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
            // Update status to error and stop sync
            await supabase
              .from('amazon_accounts')
              .update({ 
                sync_status: 'error',
                sync_message: `Transaction insert failed: ${txError.message}`,
                sync_progress: 0
              })
              .eq('id', amazonAccountId)
            throw new Error(`Failed to insert transactions: ${txError.message}`)
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
    const { count: recentTransactionCount, error: countError } = await supabase
      .from('amazon_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('amazon_account_id', amazonAccountId)
    
    if (countError) {
      console.error('[SYNC] Error counting recent transactions:', countError)
    }

    const { data: rollupData, error: rollupError } = await supabase
      .from('amazon_daily_rollups')
      .select('order_count, refund_count')
      .eq('amazon_account_id', amazonAccountId)
    
    if (rollupError) {
      console.error('[SYNC] Error fetching rollup data:', rollupError)
    }

    const rollupTransactionCount = rollupData?.reduce((sum, row) => 
      sum + (row.order_count || 0) + (row.refund_count || 0), 0
    ) || 0

    const totalTransactionCount = (recentTransactionCount || 0) + rollupTransactionCount

    console.log(`[SYNC] Transaction count: ${recentTransactionCount || 0} recent + ${rollupTransactionCount} rollups = ${totalTransactionCount} total`)

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

    // Mark this day as complete - ONLY update last_synced_to if pagination is complete
    // If we broke due to MAX_PAGES_PER_RUN, do NOT advance last_synced_to
    const updateData: any = { 
      last_sync: new Date().toISOString(),
      transaction_count: totalTransactionCount
    };
    
    // Only update last_synced_to and clear next_token if we completed ALL pages for this date range
    if (pageCount < MAX_PAGES_PER_RUN && !nextToken) {
      updateData.sync_next_token = null
      updateData.last_synced_to = endDate.toISOString() // Only advance when fully complete
      console.log('[SYNC] ✓ Date complete, advancing last_synced_to to:', endDate.toISOString())
    } else if (pageCount >= MAX_PAGES_PER_RUN && nextToken) {
      // Paused mid-day - keep last_synced_to the same so we resume the same date
      console.log('[SYNC] ⏸ Paused mid-pagination - keeping last_synced_to at:', amazonAccount.last_synced_to)
    }
    
    // Don't update if we already saved continuation token
    if (!(pageCount >= MAX_PAGES_PER_RUN && nextToken)) {
      await supabase
        .from('amazon_accounts')
        .update(updateData)
        .eq('id', amazonAccountId)
    }

    // Check if we're fully caught up (no nextToken and at yesterday)
    if (endDate >= yesterday && !nextToken && pageCount < MAX_PAGES_PER_RUN) {
      console.log('[SYNC] ✓ Fully caught up!')
      await supabase
        .from('amazon_accounts')
        .update({ 
          sync_status: 'idle',
          sync_progress: 100,
          sync_message: `Synced - ${(totalTransactionCount / 1000).toFixed(1)}K transactions`,
          initial_sync_complete: true,
          last_sync_error: null
        })
        .eq('id', amazonAccountId)
    } else if (pageCount < MAX_PAGES_PER_RUN) {
      // Completed this batch but not caught up yet
      console.log('[SYNC] ✓ Batch complete - waiting for next scheduled run')
      const daysRemaining = Math.ceil((yesterday.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
      const totalDays = Math.ceil((yesterday.getTime() - new Date(amazonAccount.last_synced_to || transactionStartDate).getTime()) / (1000 * 60 * 60 * 24))
      const progress = totalDays > 0 ? Math.min(95, Math.round((1 - (daysRemaining / totalDays)) * 100)) : 5
      
      console.log(`[SYNC] Progress: ${progress}% (${totalDays - daysRemaining}/${totalDays} days, ${totalTransactionCount} transactions)`)
      
      await supabase
        .from('amazon_accounts')
        .update({ 
          sync_status: 'idle',
          sync_progress: progress,
          sync_message: `${endDate.toISOString().split('T')[0]} (${daysRemaining}d left, ${(totalTransactionCount / 1000).toFixed(1)}K txns)`
        })
        .eq('id', amazonAccountId)
    }
    // If we hit MAX_PAGES_PER_RUN, status was already set to 'idle' with nextToken saved above

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
    
    console.log('[BACKGROUND] ✓ Sync completed')
  } catch (error) {
    console.error('[BACKGROUND] Fatal error:', error)
    
    try {
      await supabase
        .from('amazon_accounts')
        .update({ 
          sync_status: 'idle',
          sync_message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          last_sync: new Date().toISOString()
        })
        .eq('id', amazonAccountId)
    } catch (updateError) {
      console.error('[BACKGROUND] Failed to update error status:', updateError)
    }
  }
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

    const { amazonAccountId, userId, cronJob } = await req.json()

    console.log(`[SYNC] Request received - Account: ${amazonAccountId}`)

    if (!amazonAccountId) {
      return new Response(
        JSON.stringify({ error: 'Amazon account ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let actualUserId = userId
    
    if (!cronJob) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'No authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      actualUserId = user.id
    }

    // Start background sync - no HTTP timeout!
    console.log('[SYNC] Starting background sync...')
    EdgeRuntime.waitUntil(
      performBackgroundSync(amazonAccountId, actualUserId, supabase)
    )
    
    // Return immediately
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Sync started in background'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[SYNC] Request error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

addEventListener('beforeunload', (ev) => {
  console.log('[SYNC] Shutdown:', ev.detail?.reason)
})
