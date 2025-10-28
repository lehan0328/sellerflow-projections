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
    console.log('[SYNC] Starting sync for:', amazonAccount.account_name)
    
    // Get region and endpoint
    const region = MARKETPLACE_REGIONS[amazonAccount.marketplace_id] || 'US'
    const apiEndpoint = AMAZON_SPAPI_ENDPOINTS[region]
    
    // Refresh token if needed
    let accessToken = amazonAccount.encrypted_access_token
    const tokenExpiresAt = new Date(amazonAccount.token_expires_at || 0)
    
    if (tokenExpiresAt <= new Date() || !accessToken) {
      console.log('[SYNC] Refreshing token...')
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke('refresh-amazon-token', {
        body: { amazon_account_id: amazonAccountId }
      })
      
      if (refreshError) throw new Error(`Token refresh failed: ${refreshError.message}`)
      accessToken = refreshData.access_token
    }

    // Helper for authenticated requests with auto-retry on 403
    const makeRequest = async (url: string, options: any, retryCount = 0): Promise<Response> => {
      const response = await fetch(url, options)
      
      if (response.status === 403 && retryCount === 0) {
        console.log('[SYNC] Got 403, refreshing token...')
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

    // === STEP 1: FETCH SETTLEMENTS ===
    console.log('[SYNC] Step 1: Fetching settlements...')
    
    await supabase.from('amazon_accounts').update({ 
      sync_status: 'syncing',
      sync_progress: 10,
      sync_message: 'Fetching payouts...'
    }).eq('id', amazonAccountId)

    const settlementBackfillTarget = new Date()
    settlementBackfillTarget.setDate(settlementBackfillTarget.getDate() - 730)
    
    const lastSettlementSync = amazonAccount.last_settlement_sync_date ? 
      new Date(amazonAccount.last_settlement_sync_date) : null
    
    const isBackfillComplete = lastSettlementSync && lastSettlementSync <= settlementBackfillTarget
    
    if (!isBackfillComplete) {
      // Calculate batch window
      let settlementEndDate = lastSettlementSync || new Date()
      if (!lastSettlementSync) settlementEndDate.setDate(settlementEndDate.getDate() - 1)
      
      let settlementStartDate = new Date(settlementEndDate)
      settlementStartDate.setDate(settlementStartDate.getDate() - 30)
      
      if (settlementStartDate < settlementBackfillTarget) {
        settlementStartDate = new Date(settlementBackfillTarget)
      }
      
      console.log(`[SYNC] Fetching settlements from ${settlementStartDate.toISOString().split('T')[0]} to ${settlementEndDate.toISOString().split('T')[0]}`)
      
      const eventGroupsUrl = `${apiEndpoint}/finances/v0/financialEventGroups`
      const params = new URLSearchParams({
        FinancialEventGroupStartedAfter: settlementStartDate.toISOString(),
        FinancialEventGroupStartedBefore: settlementEndDate.toISOString()
      })
      
      const response = await makeRequest(`${eventGroupsUrl}?${params}`, {
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
      
      console.log(`[SYNC] Found ${groups.length} settlements`)
      
      if (groups.length === 0) {
        await supabase.from('amazon_accounts').update({ 
          sync_status: 'error',
          sync_message: 'No settlements found - check permissions or wait for sales'
        }).eq('id', amazonAccountId)
        return
      }
      
      // Process and save settlements
      const settlementsToAdd = groups.map((group: any) => {
        const settlementEndDate = group.FinancialEventGroupEnd ? new Date(group.FinancialEventGroupEnd) : null
        if (!settlementEndDate) return null
        
        const payoutDateObj = new Date(settlementEndDate)
        payoutDateObj.setDate(payoutDateObj.getDate() + 1)
        const payoutDate = payoutDateObj.toISOString().split('T')[0]
        
        const now = new Date()
        const status = settlementEndDate <= now ? 'confirmed' : 'estimated'
        const type = settlementEndDate <= now ? 'settlement' : 'open_settlement'
        
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
          type,
          payout_type: amazonAccount.payout_frequency || 'bi-weekly',
          marketplace_name: amazonAccount.marketplace_name,
          settlement_start_date: group.FinancialEventGroupStart ? 
            new Date(group.FinancialEventGroupStart).toISOString().split('T')[0] : null,
          settlement_end_date: settlementEndDate.toISOString().split('T')[0],
          raw_settlement_data: group
        }
      }).filter(Boolean)
      
      if (settlementsToAdd.length > 0) {
        await supabase.from('amazon_payouts').upsert(settlementsToAdd, { 
          onConflict: 'amazon_account_id,settlement_id'
        })
        
        console.log(`[SYNC] ✅ ${settlementsToAdd.length} settlements saved`)
        
        const isComplete = settlementStartDate <= settlementBackfillTarget
        
        await supabase.from('amazon_accounts').update({ 
          last_settlement_sync_date: settlementStartDate.toISOString(),
          sync_status: 'idle',
          sync_progress: 50,
          sync_message: isComplete ? 'Settlements complete' : `${settlementsToAdd.length} payouts saved`,
          last_sync: new Date().toISOString()
        }).eq('id', amazonAccountId)
        
        if (!isComplete) {
          console.log('[SYNC] Settlement batch complete. Next run will continue.')
          return
        }
      }
    }
    
    // === STEP 2: FETCH TRANSACTIONS VIA REPORTS ===
    console.log('[SYNC] Step 2: Fetching transactions...')
    
    const bulkSyncDone = amazonAccount.bulk_transaction_sync_complete || false
    
    if (!bulkSyncDone) {
      await supabase.from('amazon_accounts').update({ 
        sync_progress: 60,
        sync_message: 'Downloading transaction data...'
      }).eq('id', amazonAccountId)
      
      const { data: reportData, error: reportError } = await supabase.functions.invoke('sync-amazon-reports', {
        body: { accountId: amazonAccountId }
      })
      
      if (reportError || reportData?.error) {
        throw new Error(`Reports sync failed: ${reportError?.message || reportData?.error}`)
      }
      
      console.log('[SYNC] ✅ Transactions synced:', reportData)
      
      await supabase.from('amazon_accounts').update({ 
        bulk_transaction_sync_complete: true,
        sync_status: 'completed',
        sync_progress: 100,
        sync_message: `Complete! ${reportData.inserted} transactions loaded`,
        last_sync: new Date().toISOString()
      }).eq('id', amazonAccountId)
      
      return
    }
    
    // Already complete
    console.log('[SYNC] Account fully synced')
    await supabase.from('amazon_accounts').update({ 
      sync_status: 'completed',
      last_sync: new Date().toISOString()
    }).eq('id', amazonAccountId)
    
  } catch (error) {
    console.error('[SYNC] Error:', error)
    await supabase.from('amazon_accounts').update({ 
      sync_status: 'error',
      sync_message: (error as Error).message.substring(0, 200),
      last_sync_error: (error as Error).message.substring(0, 500)
    }).eq('id', amazonAccountId)
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
