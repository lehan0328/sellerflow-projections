import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { amazonAccountId } = await req.json()

    if (!amazonAccountId) {
      throw new Error('Amazon account ID is required')
    }

    // Fetch Amazon account
    const { data: amazonAccount, error: accountError } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('id', amazonAccountId)
      .eq('user_id', user.id)
      .single()

    if (accountError || !amazonAccount) {
      throw new Error('Amazon account not found')
    }

    // Determine API endpoint based on marketplace
    const marketplaceRegion = amazonAccount.marketplace_id.startsWith('A') ? 
      (amazonAccount.marketplace_id === 'A2EUQ1WTGCTBG2' ? 'ca' : 
       amazonAccount.marketplace_id === 'A1AM78C64UM0Y8' ? 'mx' : 'us') : 'eu'
    
    const apiEndpoint = marketplaceRegion === 'eu' ? 
      'https://sellingpartnerapi-eu.amazon.com' :
      'https://sellingpartnerapi-na.amazon.com'

    console.log('[FETCH] Fetching open settlement for account:', amazonAccount.account_name)
    console.log('[FETCH] API endpoint:', apiEndpoint)

    // Refresh access token if needed
    let accessToken = amazonAccount.encrypted_access_token
    const tokenExpiresAt = amazonAccount.token_expires_at ? new Date(amazonAccount.token_expires_at) : null
    const now = new Date()
    
    if (!accessToken || !tokenExpiresAt || tokenExpiresAt <= now) {
      console.log('[FETCH] Token expired or missing, refreshing...')
      
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('refresh-amazon-token', {
        body: { amazon_account_id: amazonAccountId }
      })
      
      if (tokenError || !tokenData?.accessToken) {
        console.error('[FETCH] Token refresh error:', tokenError)
        throw new Error('Failed to refresh Amazon access token')
      }
      
      accessToken = tokenData.accessToken
      console.log('[FETCH] Token refreshed successfully')
    }

    // Fetch financial event groups (settlements) - last 365 days
    const oneYearAgo = new Date()
    oneYearAgo.setDate(oneYearAgo.getDate() - 365)
    
    const eventGroupsUrl = `${apiEndpoint}/finances/v0/financialEventGroups`
    const settlementsToAdd: any[] = []
    
    let groupNextToken: string | null = null
    let groupPageCount = 0
    
    console.log('[FETCH] Fetching settlement groups from last 365 days...')
    
    do {
      const groupParams = new URLSearchParams({
        FinancialEventGroupStartedAfter: oneYearAgo.toISOString()
      })
      if (groupNextToken) {
        groupParams.append('NextToken', groupNextToken)
      }
      
      const groupResponse = await fetch(`${eventGroupsUrl}?${groupParams}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-amz-access-token': accessToken,
          'Content-Type': 'application/json'
        }
      })
      
      if (!groupResponse.ok) {
        const errorText = await groupResponse.text()
        console.error('[FETCH] Error fetching groups:', errorText)
        throw new Error(`Failed to fetch financial event groups: ${groupResponse.status}`)
      }
      
      const groupData = await groupResponse.json()
      const groups = groupData.payload?.FinancialEventGroupList || []
      
      console.log(`[FETCH] Page ${groupPageCount + 1}: Found ${groups.length} groups`)
      
      for (const group of groups) {
        if (group.FinancialEventGroupId) {
          // Get settlement end date (closing date)
          const settlementEndDate = group.FinancialEventGroupEnd ? 
            new Date(group.FinancialEventGroupEnd) : null
          
          // Calculate payout date: Amazon pays 1 day AFTER settlement closes
          let payoutDate: string
          if (settlementEndDate) {
            const payoutDateObj = new Date(settlementEndDate)
            payoutDateObj.setDate(payoutDateObj.getDate() + 1) // Add 1 day for bank deposit
            payoutDate = payoutDateObj.toISOString().split('T')[0]
          } else {
            payoutDate = new Date().toISOString().split('T')[0]
          }
          
          const status = settlementEndDate && settlementEndDate <= new Date() ? 'confirmed' : 'estimated'
          const type = settlementEndDate && settlementEndDate <= new Date() ? 'settlement' : 'open_settlement'
          
          settlementsToAdd.push({
            user_id: user.id,
            amazon_account_id: amazonAccountId,
            settlement_id: group.FinancialEventGroupId,
            payout_date: payoutDate, // Now uses closing date + 1
            total_amount: parseFloat(group.ConvertedTotal?.CurrencyAmount || group.OriginalTotal?.CurrencyAmount || '0'),
            currency: group.ConvertedTotal?.CurrencyCode || group.OriginalTotal?.CurrencyCode || 'USD',
            status: status,
            type: type,
            settlement_start_date: group.FinancialEventGroupStart ? 
              new Date(group.FinancialEventGroupStart).toISOString().split('T')[0] : null,
            settlement_end_date: group.FinancialEventGroupEnd ? 
              new Date(group.FinancialEventGroupEnd).toISOString().split('T')[0] : null
          })
        }
      }
      
      groupNextToken = groupData.payload?.NextToken || null
      groupPageCount++
      
    } while (groupNextToken && groupPageCount < 50)
    
    console.log(`[FETCH] Found ${settlementsToAdd.length} settlements`)
    
    // Save settlements
    if (settlementsToAdd.length > 0) {
      // Delete any forecasted payouts that overlap with real settlements
      const settlementDates = settlementsToAdd.map(s => s.payout_date)
      if (settlementDates.length > 0) {
        await supabase
          .from('amazon_payouts')
          .delete()
          .eq('amazon_account_id', amazonAccountId)
          .eq('status', 'forecasted')
          .in('payout_date', settlementDates)
        
        console.log(`[FETCH] Cleared forecasted payouts for ${settlementDates.length} settlement dates`)
      }
      
      const { error: settlementsError } = await supabase
        .from('amazon_payouts')
        .upsert(settlementsToAdd, { 
          onConflict: 'settlement_id,user_id',
          ignoreDuplicates: false 
        })
      
      if (settlementsError) {
        console.error('[FETCH] Error saving settlements:', settlementsError)
        throw new Error('Failed to save settlements')
      }
      
      console.log('[FETCH] Settlements saved successfully')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        settlementsFound: settlementsToAdd.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[FETCH] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
