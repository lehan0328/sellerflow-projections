import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AMAZON_SPAPI_ENDPOINTS: Record<string, string> = {
  'US': 'https://sellingpartnerapi-na.amazon.com',
  'EU': 'https://sellingpartnerapi-eu.amazon.com',
  'FE': 'https://sellingpartnerapi-fe.amazon.com',
}

const MARKETPLACE_REGIONS: Record<string, string> = {
  'ATVPDKIKX0DER': 'US', 'A2EUQ1WTGCTBG2': 'US', 'A1AM78C64UM0Y8': 'US', 'A2Q3Y263D00KWC': 'US',
  'A1PA6795UKMFR9': 'EU', 'A1RKKUPIHCS9HS': 'EU', 'A13V1IB3VIYZZH': 'EU', 'APJ6JRA9NG5V4': 'EU',
  'A1F83G8C2ARO7P': 'EU', 'A21TJRUUN4KGV': 'EU', 'A19VAU5U5O7RUS': 'FE', 'A39IBJ37TRP1C6': 'FE',
  'A1VC38T7YXB528': 'FE',
}

async function syncAmazonData(supabase: any, amazonAccount: any, userId: string) {
  const amazonAccountId = amazonAccount.id
  
  try {
    console.log('[SYNC] ===== STARTING AMAZON SYNC =====')
    console.log('[SYNC] Account:', amazonAccount.account_name)
    
    const region = MARKETPLACE_REGIONS[amazonAccount.marketplace_id] || 'US'
    const apiEndpoint = AMAZON_SPAPI_ENDPOINTS[region]
    
    // Refresh token if needed
    let accessToken = amazonAccount.encrypted_access_token
    const tokenExpiresAt = new Date(amazonAccount.token_expires_at || 0)
    
    if (tokenExpiresAt <= new Date() || !accessToken) {
      console.log('[SYNC] Refreshing access token...')
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke('refresh-amazon-token', {
        body: { amazon_account_id: amazonAccountId }
      })
      if (refreshError) throw new Error(`Token refresh failed: ${refreshError.message}`)
      accessToken = refreshData.access_token
      console.log('[SYNC] ✅ Token refreshed')
    }

    // Helper for API calls with auto-retry on 403
    const makeRequest = async (url: string, options: any, retryCount = 0): Promise<Response> => {
      const response = await fetch(url, options)
      if (response.status === 403 && retryCount === 0) {
        console.log('[SYNC] Got 403, refreshing token and retrying...')
        const { data: refreshData } = await supabase.functions.invoke('refresh-amazon-token', {
          body: { amazon_account_id: amazonAccountId }
        })
        if (refreshData?.access_token) {
          options.headers['x-amz-access-token'] = refreshData.access_token
          return makeRequest(url, options, retryCount + 1)
        }
      }
      return response
    }

    // === STEP 1: FETCH ALL SETTLEMENTS (CLOSED AND OPEN) ===
    console.log('[SYNC] ===== STEP 1: FETCHING SETTLEMENTS =====')
    
    await supabase.from('amazon_accounts').update({ 
      sync_status: 'syncing',
      sync_progress: 10,
      sync_message: 'Fetching Amazon settlements...'
    }).eq('id', amazonAccountId)

    // Fetch last 365 days of settlements
    // Amazon requires endDate to be at least 2 minutes in the past
    const endDate = new Date()
    endDate.setMinutes(endDate.getMinutes() - 5) // Set to 5 minutes ago to be safe
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 365)
    
    console.log(`[SYNC] Fetching settlements: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
    
    const eventGroupsUrl = `${apiEndpoint}/finances/v0/financialEventGroups`
    const params = new URLSearchParams({
      FinancialEventGroupStartedAfter: startDate.toISOString(),
      FinancialEventGroupStartedBefore: endDate.toISOString()
    })
    
    let allSettlements: any[] = []
    let nextToken: string | null = null
    let pageCount = 0
    
    do {
      pageCount++
      const url = nextToken 
        ? `${eventGroupsUrl}?${params}&NextToken=${encodeURIComponent(nextToken)}`
        : `${eventGroupsUrl}?${params}`
      
      console.log(`[SYNC] Fetching settlements page ${pageCount}...`)
      
      const response = await makeRequest(url, {
        headers: {
          'x-amz-access-token': accessToken,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Settlement fetch failed: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      const groups = data.payload?.FinancialEventGroupList || []
      allSettlements.push(...groups)
      
      nextToken = data.payload?.NextToken || null
      console.log(`[SYNC] Page ${pageCount}: Found ${groups.length} settlements (NextToken: ${!!nextToken})`)
      
      if (nextToken && pageCount >= 10) {
        console.log('[SYNC] Reached 10 pages, stopping for now')
        break
      }
    } while (nextToken)
    
    console.log(`[SYNC] ✅ TOTAL SETTLEMENTS FETCHED: ${allSettlements.length}`)
    
    if (allSettlements.length === 0) {
      console.log('[SYNC] ⚠️ No settlements found')
      await supabase.from('amazon_accounts').update({ 
        sync_status: 'completed',
        sync_progress: 100,
        sync_message: 'No settlements found - account may be new',
        last_sync: new Date().toISOString()
      }).eq('id', amazonAccountId)
      return
    }
    
    // Detect payout frequency based on RECENT closed settlement intervals only
    console.log('[SYNC] Analyzing payout frequency from recent closed settlements...')
    const now = new Date()
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    
    // Get only CLOSED settlements from the last 60 days, sorted by end date
    const recentClosedSettlements = allSettlements
      .filter((g: any) => {
        // Must have an end date (closed settlement)
        if (!g.FinancialEventGroupEnd) return false
        const endDate = new Date(g.FinancialEventGroupEnd)
        // Must be within last 60 days and not in the future
        return endDate >= sixtyDaysAgo && endDate <= now
      })
      .map((g: any) => ({
        id: g.FinancialEventGroupId,
        endDate: new Date(g.FinancialEventGroupEnd)
      }))
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    
    console.log(`[SYNC] Found ${recentClosedSettlements.length} recent closed settlements in last 60 days`)
    
    let detectedFrequency = 'bi-weekly' // default
    
    if (recentClosedSettlements.length >= 3) {
      // Calculate intervals between consecutive settlements
      const intervals: number[] = []
      for (let i = 1; i < recentClosedSettlements.length; i++) {
        const daysDiff = Math.abs(
          (recentClosedSettlements[i].endDate.getTime() - recentClosedSettlements[i-1].endDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        intervals.push(daysDiff)
      }
      
      console.log(`[SYNC] Settlement intervals (days): ${intervals.map(i => i.toFixed(1)).join(', ')}`)
      
      // If we have ANY intervals less than 10 days, it's likely daily
      // (allowing some margin for weekends/holidays)
      const hasShortIntervals = intervals.some(d => d < 10)
      
      if (hasShortIntervals) {
        detectedFrequency = 'daily'
        console.log('[SYNC] ✅ Detected DAILY payout frequency (found intervals < 10 days)')
      } else {
        // Count intervals to be sure
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
        console.log(`[SYNC] Average interval: ${avgInterval.toFixed(1)} days`)
        
        if (avgInterval < 10) {
          detectedFrequency = 'daily'
          console.log('[SYNC] ✅ Detected DAILY payout frequency (average < 10 days)')
        } else {
          detectedFrequency = 'bi-weekly'
          console.log('[SYNC] ✅ Detected BI-WEEKLY payout frequency (average >= 10 days)')
        }
      }
      
      // Update amazon_account with detected frequency
      await supabase.from('amazon_accounts').update({ 
        payout_frequency: detectedFrequency
      }).eq('id', amazonAccountId)
      
      console.log(`[SYNC] 💾 Updated payout_frequency to: ${detectedFrequency}`)
    } else {
      console.log('[SYNC] ⚠️ Not enough recent closed settlements (need 3+) to detect frequency, using default: bi-weekly')
    }
    
    // Process and save settlements (including open ones)
    const settlementsToSave = allSettlements.map((group: any) => {
      const settlementStartDate = group.FinancialEventGroupStart ? new Date(group.FinancialEventGroupStart) : null
      const settlementEndDate = group.FinancialEventGroupEnd ? new Date(group.FinancialEventGroupEnd) : null
      const now = new Date()
      
      // Determine payout date and status
      let payoutDate: string
      let status: string
      
      if (settlementEndDate) {
        // Closed settlement - payout is 1 day after settlement end
        const payoutDateObj = new Date(settlementEndDate)
        payoutDateObj.setDate(payoutDateObj.getDate() + 1)
        payoutDate = payoutDateObj.toISOString().split('T')[0]
        status = settlementEndDate <= now ? 'confirmed' : 'estimated'
      } else if (settlementStartDate) {
        // Open settlement - estimate payout based on start date + typical cycle (14 days)
        const estimatedPayoutObj = new Date(settlementStartDate)
        estimatedPayoutObj.setDate(estimatedPayoutObj.getDate() + 15) // 14 day cycle + 1 day for payout
        payoutDate = estimatedPayoutObj.toISOString().split('T')[0]
        status = 'estimated'
      } else {
        // No dates available, skip this settlement
        return null
      }
      
      const totalAmount = parseFloat(group.ConvertedTotal?.CurrencyAmount || group.OriginalTotal?.CurrencyAmount || '0')
      
      return {
        user_id: userId,
        account_id: amazonAccount.account_id,
        amazon_account_id: amazonAccountId,
        settlement_id: group.FinancialEventGroupId,
        payout_date: payoutDate,
        total_amount: totalAmount,
        currency_code: group.ConvertedTotal?.CurrencyCode || group.OriginalTotal?.CurrencyCode || 'USD',
        status,
        payout_type: detectedFrequency,
        marketplace_name: amazonAccount.marketplace_name,
        raw_settlement_data: group
      }
    }).filter(Boolean)
    
    console.log(`[SYNC] Saving ${settlementsToSave.length} settlements to database...`)
    
    const { error: upsertError } = await supabase
      .from('amazon_payouts')
      .upsert(settlementsToSave, { onConflict: 'amazon_account_id,settlement_id' })
    
    if (upsertError) {
      console.error('[SYNC] Error saving settlements:', upsertError)
      throw new Error(`Failed to save settlements: ${upsertError.message}`)
    }
    
    console.log(`[SYNC] ✅ ${settlementsToSave.length} settlements saved to amazon_payouts table`)
    
    await supabase.from('amazon_accounts').update({ 
      sync_progress: 50,
      sync_message: `${settlementsToSave.length} payouts loaded`,
      last_sync: new Date().toISOString()
    }).eq('id', amazonAccountId)
    
    // === STEP 2: TRIGGER REPORT SYNC FOR DAILY ACCOUNTS ===
    console.log('[SYNC] ===== STEP 2: CHECKING REPORT SYNC ELIGIBILITY =====')
    
    // Check if this is a daily payout account (already detected in Step 1)
    const isDaily = detectedFrequency === 'daily'
    
    if (isDaily) {
      console.log('[SYNC] ✅ Daily payout account detected')
      
      // Check if report sync is needed (every 12 hours)
      const { data: accountData } = await supabase
        .from('amazon_accounts')
        .select('last_report_sync')
        .eq('id', amazonAccountId)
        .single()
      
      const lastReportSync = accountData?.last_report_sync ? new Date(accountData.last_report_sync) : null
      const now = new Date()
      const hoursSinceReportSync = lastReportSync 
        ? (now.getTime() - lastReportSync.getTime()) / (1000 * 60 * 60)
        : 999 // Force sync if never synced
      
      // Sync reports twice per day (every 12 hours)
      if (hoursSinceReportSync >= 12) {
        await supabase.from('amazon_accounts').update({ 
          sync_progress: 70,
          sync_message: 'Fetching order delivery dates for forecasting...'
        }).eq('id', amazonAccountId)
        
        console.log(`[SYNC] Triggering report sync (last sync: ${hoursSinceReportSync.toFixed(1)}h ago)`)
        
        try {
          const { data: reportData, error: reportError } = await supabase.functions.invoke(
            'sync-amazon-reports-daily',
            { body: { amazonAccountId, days: 14 } }
          )
          
          if (reportError || reportData?.error) {
            console.error('[SYNC] Reports sync failed (non-critical):', reportError || reportData?.error)
            // Don't throw - settlement data is still valid
            await supabase.from('amazon_accounts').update({
              sync_status: 'completed',
              sync_progress: 100,
              sync_message: `${settlementsToSave.length} payouts synced (reports failed - using estimated delivery dates)`,
              last_sync: now.toISOString()
            }).eq('id', amazonAccountId)
          } else {
            console.log('[SYNC] ✅ Reports synced:', reportData)
            
            await supabase.from('amazon_accounts').update({
              sync_progress: 95,
              sync_message: 'Processing delivery dates...'
            }).eq('id', amazonAccountId)
            
            await supabase.from('amazon_accounts').update({
              sync_status: 'completed',
              sync_progress: 100,
              sync_message: `${settlementsToSave.length} payouts + ${reportData.ordersCount || 0} orders synced`,
              last_sync: now.toISOString(),
              last_report_sync: now.toISOString()
            }).eq('id', amazonAccountId)
          }
        } catch (error) {
          console.error('[SYNC] Exception during report sync:', error)
          await supabase.from('amazon_accounts').update({
            sync_status: 'completed',
            sync_progress: 100,
            sync_message: `${settlementsToSave.length} payouts synced (report sync error)`,
            last_sync: now.toISOString()
          }).eq('id', amazonAccountId)
        }
      } else {
        console.log(`[SYNC] Skipping report sync (synced ${hoursSinceReportSync.toFixed(1)}h ago, need 12h)`)
        await supabase.from('amazon_accounts').update({
          sync_status: 'completed',
          sync_progress: 100,
          sync_message: `${settlementsToSave.length} payouts synced`,
          last_sync: now.toISOString()
        }).eq('id', amazonAccountId)
      }
    } else {
      // Bi-weekly account - skip reports entirely
      console.log('[SYNC] Bi-weekly account - skipping reports sync')
      await supabase.from('amazon_accounts').update({
        sync_status: 'completed',
        sync_progress: 100,
        sync_message: `${settlementsToSave.length} payouts synced`,
        last_sync: now.toISOString()
      }).eq('id', amazonAccountId)
    }
    
    console.log('[SYNC] ===== SYNC COMPLETE =====')
    
  } catch (error) {
    console.error('[SYNC] ===== SYNC FAILED =====')
    console.error('[SYNC] Error:', error)
    await supabase.from('amazon_accounts').update({ 
      sync_status: 'error',
      sync_message: (error as Error).message.substring(0, 200),
      last_sync_error: (error as Error).message.substring(0, 500)
    }).eq('id', amazonAccountId)
    throw error
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
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { amazonAccountId, userId, cronJob } = await req.json()

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

    // Fetch account
    const { data: amazonAccount, error: accountError } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('id', amazonAccountId)
      .single()

    if (accountError || !amazonAccount) {
      return new Response(
        JSON.stringify({ error: 'Account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already syncing
    if (amazonAccount.sync_status === 'syncing') {
      const lastSync = amazonAccount.last_sync ? new Date(amazonAccount.last_sync) : null
      const minutesSinceSync = lastSync ? (Date.now() - lastSync.getTime()) / 60000 : 999
      
      if (minutesSinceSync < 3) {
        return new Response(
          JSON.stringify({ success: true, message: 'Already syncing' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Auto-unstuck if stuck > 3 minutes
      console.log('[SYNC] Auto-unstuck: resetting stuck sync')
      await supabase.from('amazon_accounts').update({ 
        sync_status: 'idle',
        sync_message: 'Auto-restarting...'
      }).eq('id', amazonAccountId)
    }

    // Start sync
    await syncAmazonData(supabase, amazonAccount, actualUserId)
    
    return new Response(
      JSON.stringify({ success: true, message: 'Sync complete' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[SYNC] Request error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
