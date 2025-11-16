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

async function syncAmazonData(supabase: any, amazonAccount: any, userId: string, syncType: string = 'manual') {
  const amazonAccountId = amazonAccount.id
  const syncStartTime = Date.now();
  let syncLogId: string | null = null;
  let totalPayoutsSynced = 0;
  let totalTransactionsSynced = 0;

  try {
    console.log('[SYNC] ===== STARTING AMAZON SYNC =====')
    console.log('[SYNC] Account:', amazonAccount.account_name)
    console.log('[SYNC] Marketplace:', amazonAccount.marketplace_name)

    // Skip non-US marketplaces entirely
    if (amazonAccount.marketplace_name !== 'United States') {
      console.log(`[SYNC] Skipping non-US marketplace: ${amazonAccount.marketplace_name}`)

      // Create sync log entry
      const { data: syncLog } = await supabase
        .from('amazon_sync_logs')
        .insert({
          user_id: userId,
          account_id: amazonAccountId,
          sync_type: syncType,
          sync_status: 'skipped',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          metadata: {
            account_name: amazonAccount.account_name,
            marketplace_name: amazonAccount.marketplace_name,
            skip_reason: 'Non-US marketplace not included in forecasts'
          }
        })
        .select()
        .single();

      await supabase.from('amazon_accounts').update({
        sync_status: 'idle',
        sync_message: 'Non-US marketplace - sync skipped',
        last_sync: new Date().toISOString()
      }).eq('id', amazonAccountId);

      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: 'Non-US marketplace not included in forecasts',
          marketplace: amazonAccount.marketplace_name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('amazon_sync_logs')
      .insert({
        user_id: userId,
        account_id: amazonAccountId,
        sync_type: 'manual',
        sync_status: 'started',
        started_at: new Date().toISOString(),
        metadata: {
          account_name: amazonAccount.account_name,
          marketplace_name: amazonAccount.marketplace_name
        }
      })
      .select()
      .single();

    if (!logError && syncLog) {
      syncLogId = syncLog.id;
      console.log('[SYNC] Created sync log:', syncLogId);
    }

    const region = MARKETPLACE_REGIONS[amazonAccount.marketplace_id] || 'US'
    const apiEndpoint = AMAZON_SPAPI_ENDPOINTS[region]

    // Inline token refresh (edge-to-edge invoke doesn't work reliably)
    console.log('[SYNC] Checking token expiration...')
    const tokenExpiresAt = new Date(amazonAccount.token_expires_at || 0)
    let accessToken: string

    if (tokenExpiresAt <= new Date(Date.now() + 300000) || !amazonAccount.encrypted_access_token) {
      console.log('[SYNC] Token expired or expiring soon, refreshing...')

      // Decrypt credentials
      const { data: refreshToken } = await supabase.rpc('decrypt_banking_credential', {
        encrypted_text: amazonAccount.encrypted_refresh_token
      })
      const { data: clientId } = await supabase.rpc('decrypt_banking_credential', {
        encrypted_text: amazonAccount.encrypted_client_id
      })
      const { data: clientSecret } = await supabase.rpc('decrypt_banking_credential', {
        encrypted_text: amazonAccount.encrypted_client_secret
      })

      if (!refreshToken || !clientId || !clientSecret) {
        throw new Error('Failed to decrypt Amazon credentials')
      }

      // Get token from Amazon
      const AMAZON_TOKEN_ENDPOINTS: Record<string, string> = {
        'US': 'https://api.amazon.com/auth/o2/token',
        'EU': 'https://api.amazon.co.uk/auth/o2/token',
        'FE': 'https://api.amazon.co.jp/auth/o2/token',
      }

      const tokenResponse = await fetch(AMAZON_TOKEN_ENDPOINTS[region], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error(`Token refresh failed: ${tokenResponse.status}`)
      }

      const tokenData = await tokenResponse.json()
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

      // Update account
      await supabase.rpc('update_secure_amazon_account', {
        p_account_id: amazonAccountId,
        p_access_token: tokenData.access_token,
        p_token_expires_at: expiresAt.toISOString(),
      })

      accessToken = tokenData.access_token
      console.log('[SYNC] ✅ Token refreshed, expires:', expiresAt.toISOString())
    } else {
      // Decrypt existing token
      const { data: decryptedToken } = await supabase.rpc('decrypt_banking_credential', {
        encrypted_text: amazonAccount.encrypted_access_token
      })
      accessToken = decryptedToken
      console.log('[SYNC] ✅ Using existing token, expires:', tokenExpiresAt.toISOString())
    }

    // Helper for API calls with retry on throttling
    const makeRequest = async (url: string, options: any, retryCount = 0): Promise<Response> => {
      const response = await fetch(url, options)

      // Retry on throttling (503/429)
      if ((response.status === 503 || response.status === 429) && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
        console.log(`[SYNC] Rate limited, waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return makeRequest(url, options, retryCount + 1)
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

    // Fetch settlements - use 365 days for initial sync, 2 days for incremental
    // Amazon requires endDate to be at least 2 minutes in the past
    const endDate = new Date()
    endDate.setMinutes(endDate.getMinutes() - 5) // Set to 5 minutes ago to be safe

    // Check if this is initial sync or ongoing
    const isInitialSync = !amazonAccount.initial_sync_complete
    const startDate = new Date()

    if (isInitialSync) {
      startDate.setDate(startDate.getDate() - 365) // Initial: last year
      console.log('[SYNC] INITIAL sync - fetching 365 days of history')
    } else {
      startDate.setDate(startDate.getDate() - 4) // Ongoing: last 4 days to catch API delays
      console.log('[SYNC] INCREMENTAL sync - fetching last 4 days (accounts for API delays)')
    }

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

      if (syncLogId) {
        await supabase.from('amazon_sync_logs').update({
         sync_status: 'completed',
         completed_at: new Date().toISOString(),
         sync_duration_ms: Date.now() - syncStartTime,
         transactions_synced: 0,
         payouts_synced: 0,
         metadata: {
            ...amazonAccount.metadata,
            notes: 'No new settlements found in lookback period'
         }
       }).eq('id', syncLogId);
     }

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
        if (!g.FinancialEventGroupEnd) return false
        const endDate = new Date(g.FinancialEventGroupEnd)
        return endDate >= sixtyDaysAgo && endDate <= now
      })
      .map((g: any) => ({
        id: g.FinancialEventGroupId,
        endDate: new Date(g.FinancialEventGroupEnd)
      }))
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())

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

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      
      if (avgInterval < 10) {
        detectedFrequency = 'daily'
      } else {
        detectedFrequency = 'bi-weekly'
      }

      // Update amazon_account with detected frequency
      await supabase.from('amazon_accounts').update({
        payout_frequency: detectedFrequency
      }).eq('id', amazonAccountId)
    }

    // === NEW: Filter B2B Settlements by Inspecting Events ===
    // B2B/Invoiced settlements are separate from standard settlements.
    // They often have matching durations (14 days) but different contents (no service fees, different balance behavior).
    // We must fetch events for each candidate settlement to confirm.
    
    const processSettlementCandidates = async () => {
      const candidates = allSettlements.filter((group: any) => {
        const settlementEndDate = group.FinancialEventGroupEnd ? new Date(group.FinancialEventGroupEnd) : null
        const currentTime = new Date()

        // Only process confirmed/closed settlements in the past
        if (!settlementEndDate || settlementEndDate > currentTime) return false
        
        // Only process Succeeded settlements
        if (group.FundTransferStatus !== 'Succeeded') return false
        
        return true
      })
      
      console.log(`[SYNC] Analyzing ${candidates.length} candidates for B2B exclusion...`)
      
      const results = []
      
      const BATCH_SIZE = 3; 
      for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const batch = candidates.slice(i, i + BATCH_SIZE)
        
        const batchPromises = batch.map(async (group: any) => {
          try {
            const beginningBalance = parseFloat(group.BeginningBalance?.CurrencyAmount || '0');
            
            let isB2B = false;
            let checkReason = 'Standard settlement analysis';
            
            // We still check beginningBalance == 0 as a primary filter to decide IF we need to fetch events.
            // Standard rolling reserves almost never hit exactly 0.00.
            if (beginningBalance === 0) {
              
              const eventsUrl = `${apiEndpoint}/finances/v0/financialEventGroups/${group.FinancialEventGroupId}/financialEvents?MaxResultsPerPage=100`; // Increased limit slightly to ensure we catch the items
              const eventResponse = await makeRequest(eventsUrl, {
                headers: {
                  'x-amz-access-token': accessToken,
                  'Content-Type': 'application/json'
                }
              });
              
              if (eventResponse.ok) {
                const eventData = await eventResponse.json();
                const events = eventData.payload?.FinancialEvents || {};
                const shipmentEvents = events.ShipmentEventList || [];

                // SOLUTION 3 IMPLEMENTATION:
                // Check strictly for Tax Exemption indicators common in Invoiced/B2B orders
                
                if (shipmentEvents.length > 0) {
                  // We check if ANY item in the shipment list demonstrates B2B tax exemption
                  const hasB2BIndicators = shipmentEvents.some((shipment: any) => {
                    return shipment.ShipmentItemList?.some((item: any) => {
                      
                      // Indicator A: Tax Withholding Logic
                      // The Tax Model is "MarketplaceFacilitator", but the actual TaxesWithheld array is EMPTY.
                      // This implies the Marketplace Facilitator (Amazon) acknowledged the tax model but collected nothing (Tax Exempt).
                      const taxList = item.ItemTaxWithheldList || [];
                      const isTaxExempt = taxList.some((t: any) => 
                        t.TaxCollectionModel === 'MarketplaceFacilitator' && 
                        (!t.TaxesWithheld || t.TaxesWithheld.length === 0)
                      );

                      // Indicator B: Private Label Credit Card (PLCC) Promotion
                      // Often used for Amazon Business financing
                      const promoList = item.PromotionList || [];
                      const hasPLCC = promoList.some((p: any) => 
                        p.PromotionId && p.PromotionId.includes('PLCC')
                      );

                      return isTaxExempt || hasPLCC;
                    });
                  });

                  if (hasB2BIndicators) {
                    const eventInJson = JSON.stringify(events, null, 2);
                    const DEBUG_USER_ID = '36c0828a-7428-48af-a1b4-c31b4d5a0480';
                    if( userId === DEBUG_USER_ID){
                      console.log(`[DEBUG] 🔍 INSPECT EXCLUDED GroupId:${group.FinancialEventGroupId} Amount: ${group.OriginalTotal?.CurrencyAmount} EVENT: ${eventInJson}`);
                    }
                    isB2B = true;
                    checkReason = 'Detected Tax-Exempt (Empty Withholding) or PLCC Promotion';
                    
                  }
                }
              }
            }
            
            if (isB2B) {
              // console.log(`[SYNC] 🚫 EXCLUDING B2B/Invoiced Settlement: ${group.FinancialEventGroupId} (${checkReason}) - Amount: ${group.OriginalTotal?.CurrencyAmount}`);
              return null;
            }
            
            return group;
          } catch (err) {
            console.warn(`[SYNC] Failed to inspect settlement ${group.FinancialEventGroupId}, including by default:`, err);
            return group; 
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Slight delay between batches
        if (i + BATCH_SIZE < candidates.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return results.filter(Boolean);
    };
    
    const validSettlements = await processSettlementCandidates();
    
    const settlementsToSave = validSettlements.map((group: any) => {
       // Map to DB structure (same as before)
      const settlementEndDate = new Date(group.FinancialEventGroupEnd)
      const totalAmount = parseFloat(group.ConvertedTotal?.CurrencyAmount || group.OriginalTotal?.CurrencyAmount || '0');
      
      const payoutDate = settlementEndDate.toISOString().split('T')[0]
      
      return {
        user_id: userId,
        account_id: amazonAccount.account_id,
        amazon_account_id: amazonAccountId,
        settlement_id: group.FinancialEventGroupId,
        payout_date: payoutDate,
        total_amount: totalAmount,
        currency_code: group.ConvertedTotal?.CurrencyCode || group.OriginalTotal?.CurrencyCode || 'USD',
        status: 'confirmed',
        payout_type: detectedFrequency,
        marketplace_name: amazonAccount.marketplace_name,
        raw_settlement_data: group
      }
    });

    console.log(`[SYNC] Saving ${settlementsToSave.length} settlements to database...`)

    // Check for existing forecasts and preserve their data before replacement
    console.log(`[SYNC] Checking for forecasts to preserve...`)
    for (const settlement of settlementsToSave) {
      // Only check for confirmed settlements (not estimates)
      if (settlement.status === 'confirmed') {
        // Extract settlement dates from raw data
        const settlementEndDate = settlement.raw_settlement_data?.FinancialEventGroupEnd
          ? new Date(settlement.raw_settlement_data.FinancialEventGroupEnd)
          : new Date(settlement.payout_date);

        const settlementStartDate = settlement.raw_settlement_data?.FinancialEventGroupStart
          ? new Date(settlement.raw_settlement_data.FinancialEventGroupStart)
          : null;

        // CRITICAL: Use settlement close date (NOT payout date) to find forecasts
        // Settlement closes at night (e.g., Nov 1 8pm = Nov 2 00:01 UTC)
        // We want forecasts BEFORE the settlement closed (e.g., Oct 31 + Nov 1)
        const settlementCloseDate = settlementEndDate.toISOString().split('T')[0];
        const settlementStartDateStr = settlementStartDate?.toISOString().split('T')[0];

        // Look back up to 7 days from settlement close
        const lookbackStart = new Date(settlementCloseDate);
        lookbackStart.setDate(lookbackStart.getDate() - 7);

        const { data: rolledForecasts } = await supabase
          .from('amazon_payouts')
          .select('id, payout_date, total_amount, modeling_method, settlement_id')
          .eq('amazon_account_id', settlement.amazon_account_id)
          .eq('user_id', settlement.user_id) // CRITICAL: Match user_id
          .eq('status', 'forecasted')
          .gte('payout_date', lookbackStart.toISOString().split('T')[0])
          .lt('payout_date', settlementCloseDate); // CRITICAL: < not <=

        if (rolledForecasts && rolledForecasts.length > 0) {
          // Sum all rolled-over forecasts
          const totalForecastedAmount = rolledForecasts.reduce((sum: any, f: any) => sum + Number(f.total_amount), 0);
          const actualAmount = Number(settlement.total_amount);

          // Calculate MAPE: |difference| / actual * 100
          const mape = actualAmount !== 0
            ? (Math.abs(actualAmount - totalForecastedAmount) / actualAmount) * 100
            : 0;
          const accuracyPercent = 100 - mape;

          // Calculate days accumulated in settlement period
          const daysAccumulated = settlementStartDate && settlementEndDate
            ? Math.ceil((settlementEndDate.getTime() - settlementStartDate.getTime()) / (1000 * 60 * 60 * 24))
            : rolledForecasts.length;

          // Capture individual forecast details
          const forecastDetails = rolledForecasts.map((f: any) => ({
            date: f.payout_date,
            amount: Number(f.total_amount),
            method: f.modeling_method
          }));

          console.log(`[SYNC] 📊 Rollover detected for settlement closing ${settlementCloseDate}:`, {
            settlementPeriod: `${settlementStartDateStr} to ${settlementCloseDate}`,
            daysAccumulated,
            forecastsIncluded: rolledForecasts.length,
            forecastDates: rolledForecasts.map((f: any) => f.payout_date),
            totalForecasted: totalForecastedAmount,
            actual: actualAmount,
            accuracy: accuracyPercent.toFixed(1) + '%',
            payoutReceived: settlement.payout_date
          });

          // Preserve forecast data in the settlement record
          settlement.original_forecast_amount = totalForecastedAmount;
          settlement.forecast_replaced_at = new Date().toISOString();
          settlement.forecast_accuracy_percentage = accuracyPercent;
          settlement.modeling_method = rolledForecasts[0].modeling_method || settlement.modeling_method;

          // Log to forecast_accuracy_log with settlement details
          const differenceAmount = actualAmount - totalForecastedAmount;
          const differencePercentage = actualAmount !== 0
            ? (Math.abs(differenceAmount) / actualAmount) * 100
            : 0;

          const { error: logError } = await supabase
            .from('forecast_accuracy_log')
            .insert({
              user_id: settlement.user_id,
              account_id: settlement.account_id,
              amazon_account_id: settlement.amazon_account_id,
              payout_date: settlement.payout_date,
              settlement_close_date: settlementCloseDate,
              settlement_period_start: settlementStartDateStr,
              settlement_period_end: settlementCloseDate,
              days_accumulated: daysAccumulated,
              forecasted_amount: totalForecastedAmount,
              forecasted_amounts_by_day: forecastDetails,
              actual_amount: actualAmount,
              difference_amount: differenceAmount,
              difference_percentage: differencePercentage,
              settlement_id: settlement.settlement_id,
              marketplace_name: settlement.marketplace_name,
              modeling_method: rolledForecasts[0]?.modeling_method
            });

          if (logError) {
            console.error(`[SYNC] Failed to log accuracy for ${settlement.payout_date}:`, logError);
          } else {
            console.log(`[SYNC] ✅ Logged accuracy with settlement period ${settlementStartDateStr} to ${settlementCloseDate}`);
          }

          // DO NOT DELETE FORECASTS - they should remain for historical comparison
          // Users need to see both forecasts and actuals side-by-side
          console.log(`[SYNC] ✅ Preserved ${rolledForecasts.length} forecasts for historical comparison`);
        }
      }
    }

    const { error: upsertError } = await supabase
      .from('amazon_payouts')
      .upsert(settlementsToSave, { onConflict: 'amazon_account_id,settlement_id' })

    if (upsertError) {
      console.error('[SYNC] Error saving settlements:', upsertError)
      throw new Error(`Failed to save settlements: ${upsertError.message}`)
    }

    console.log(`[SYNC] ✅ ${settlementsToSave.length} settlements saved to amazon_payouts table`)

    totalPayoutsSynced = settlementsToSave.length;

    // Mark sync as complete
    await supabase.from('amazon_accounts').update({
      sync_status: 'idle',
      sync_progress: 100,
      sync_message: `${settlementsToSave.length} payouts synced`,
      last_sync: now.toISOString()
    }).eq('id', amazonAccountId)

    console.log('[SYNC] ===== SYNC COMPLETE =====')

    // Trigger rollover check after sync completes
    console.log('[SYNC] Triggering forecast rollover check...');
    try {
      const { data: rolloverResult, error: rolloverError } = await supabase.functions.invoke('rollover-forecast', {
        body: {
          amazonAccountId: amazonAccountId,
          userId: userId
        }
      });

      if (rolloverError) {
        console.error('[SYNC] Rollover check failed:', rolloverError);
      } else {
        console.log('[SYNC] Rollover check completed:', rolloverResult);
      }
    } catch (rolloverErr) {
      console.error('[SYNC] Error invoking rollover function:', rolloverErr);
      // Don't fail the sync if rollover fails
    }

    // Regenerate forecasts after rollover completes (only if forecasts are enabled)
    console.log('[SYNC] Checking if forecasts are enabled...');
    try {
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('forecasts_enabled')
        .maybeSingle();
      
      const forecastsEnabled = userSettings?.forecasts_enabled ?? true;
      
      if (forecastsEnabled) {
        console.log('[SYNC] Forecasts enabled, regenerating forecasts after settlement detection...');
        const { data: forecastResult, error: forecastError } = await supabase.functions.invoke('forecast-amazon-payouts', {
          body: {
            userId: userId
          }
        });

        if (forecastError) {
          console.error('[SYNC] Forecast regeneration failed:', forecastError);
        } else {
          console.log('[SYNC] Forecast regeneration completed:', forecastResult);
        }
      } else {
        console.log('[SYNC] Forecasts disabled by user, skipping forecast regeneration');
      }
    } catch (forecastErr) {
      console.error('[SYNC] Error invoking forecast function:', forecastErr);
      // Don't fail the sync if forecast fails
    }

    // Fetch open settlements for ALL accounts (daily and bi-weekly)
    console.log('[SYNC] Fetching open settlements for all account types...');
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);
      
      const eventGroupsUrl = `${apiEndpoint}/finances/v0/financialEventGroups`;
      let groupNextToken: string | null = null;
      let openSettlementsFound = 0;
      
      do {
        const groupParams = new URLSearchParams({
          FinancialEventGroupStartedAfter: oneYearAgo.toISOString()
        });
        if (groupNextToken) {
          groupParams.append('NextToken', groupNextToken);
        }
        
        const groupResponse = await fetch(`${eventGroupsUrl}?${groupParams}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-amz-access-token': accessToken,
            'Content-Type': 'application/json'
          }
        });
        
        if (!groupResponse.ok) {
          const errorText = await groupResponse.text();
          console.error('[SYNC] Error fetching open settlements:', errorText);
          break;
        }
        
        const groupData = await groupResponse.json();
        const groups = groupData.payload?.FinancialEventGroupList || [];
        
        console.log(`[SYNC] Found ${groups.length} settlement groups, filtering for open ones...`);
        
    for (const group of groups) {
      if (!group.FinancialEventGroupId) {
        console.log('[SYNC] Skipping group without ID');
        continue;
      }
      
      const hasEndDate = !!group.FinancialEventGroupEnd;
      const hasStartDate = !!group.FinancialEventGroupStart;
      
      if (!hasStartDate) {
        console.log('[SYNC] Skipping group without start date');
        continue;
      }
      
      let isOpen = false;
      let payoutDate: string;
      
      if (!hasEndDate) {
        // This is a currently open settlement (no end date yet)
        console.log(`[SYNC] Found open settlement (no end date): ${group.FinancialEventGroupId}`);
        isOpen = true;
        
        // Estimate payout date based on account type
        const today = new Date();
        if (amazonAccount.payout_frequency === 'bi-weekly') {
          // Bi-weekly: estimate based on typical 2-week cycle
          const startDate = new Date(group.FinancialEventGroupStart);
          const estimatedEndDate = new Date(startDate);
          estimatedEndDate.setDate(estimatedEndDate.getDate() + 14);
          estimatedEndDate.setDate(estimatedEndDate.getDate() + 1); // +1 for payout
          payoutDate = estimatedEndDate.toISOString().split('T')[0];
        } else {
          // Daily: tomorrow or day after
          today.setDate(today.getDate() + 2);
          payoutDate = today.toISOString().split('T')[0];
        }
      } else {
        // Has an end date - check if it's in the future
        const settlementEndDate = new Date(group.FinancialEventGroupEnd);
        const now = new Date();
        
        if (settlementEndDate <= now) {
          continue; // Skip closed settlements
        }
        
        console.log(`[SYNC] Found future settlement: ${group.FinancialEventGroupId}, ends: ${settlementEndDate.toISOString()}`);
        isOpen = true;
        
        // Calculate payout date (1 day after settlement ends)
        const payoutDateObj = new Date(settlementEndDate);
        payoutDateObj.setDate(payoutDateObj.getDate() + 1);
        payoutDate = payoutDateObj.toISOString().split('T')[0];
      }
      
      if (!isOpen) continue;
          
          const totalAmount = parseFloat(
            group.ConvertedTotal?.CurrencyAmount || 
            group.OriginalTotal?.CurrencyAmount || 
            '0'
          );
          
          console.log(`[SYNC] Upserting open settlement: ${payoutDate}, amount: ${totalAmount}`);
          
          // Upsert open settlement
          const { error: upsertError } = await supabase
            .from('amazon_payouts')
            .upsert({
              user_id: userId,
              amazon_account_id: amazonAccountId,
              settlement_id: group.FinancialEventGroupId,
              payout_date: payoutDate,
              total_amount: totalAmount,
              currency_code: group.ConvertedTotal?.CurrencyCode || 'USD',
              marketplace_name: amazonAccount.marketplace_name,
              status: 'estimated',
              payout_type: amazonAccount.payout_frequency || 'daily',
              raw_settlement_data: group
            }, {
              onConflict: 'settlement_id,amazon_account_id'
            });
          
          if (upsertError) {
            console.error('[SYNC] Error upserting open settlement:', upsertError);
          } else {
            openSettlementsFound++;
          }
        }
        
        groupNextToken = groupData.payload?.NextToken || null;
      } while (groupNextToken);
      
      console.log(`[SYNC] ✅ Open settlements processed: ${openSettlementsFound}`);
    } catch (openSettlementErr) {
      console.error('[SYNC] Error fetching open settlements:', openSettlementErr);
      // Don't fail the sync if open settlement fetch fails
    }

    // Update sync log with completion
    if (syncLogId) {
      const syncDuration = Date.now() - syncStartTime;
      await supabase
        .from('amazon_sync_logs')
        .update({
          sync_status: 'completed',
          completed_at: new Date().toISOString(),
          sync_duration_ms: syncDuration,
          transactions_synced: totalTransactionsSynced,
          payouts_synced: totalPayoutsSynced
        })
        .eq('id', syncLogId);
      console.log('[SYNC] Updated sync log with completion');
    }

  } catch (error) {
    console.error('[SYNC] ===== SYNC FAILED =====')
    console.error('[SYNC] Error:', error)

    // Update sync log with error
    if (syncLogId) {
      const syncDuration = Date.now() - syncStartTime;
      await supabase
        .from('amazon_sync_logs')
        .update({
          sync_status: 'failed',
          completed_at: new Date().toISOString(),
          sync_duration_ms: syncDuration,
          error_message: (error as Error).message.substring(0, 500)
        })
        .eq('id', syncLogId);
      console.log('[SYNC] Updated sync log with error');
    }

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
    await syncAmazonData(supabase, amazonAccount, actualUserId, cronJob ? 'scheduled' : 'manual' )

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
