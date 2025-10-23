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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body first to check if this is a cron job
    const { amazonAccountId, userId, cronJob } = await req.json()

    if (!amazonAccountId) {
      return new Response(
        JSON.stringify({ error: 'Amazon account ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let actualUserId = userId
    
    // Only check auth for manual syncs (not cron jobs)
    if (!cronJob) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'No authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify the JWT and get user
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      actualUserId = user.id
      
      // Verify user owns this account
      const { data: accountCheck } = await supabase
        .from('amazon_accounts')
        .select('user_id')
        .eq('id', amazonAccountId)
        .single()
      
      if (!accountCheck || accountCheck.user_id !== actualUserId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get user_id from request or verify from token
    let actualUserId = userId
    if (!cronJob) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      actualUserId = user?.id
    }

    // Set status to 'syncing' BEFORE starting background task
    // This ensures the UI sees the status update immediately
    console.log(`Setting sync status to 'syncing' for account ${amazonAccountId}`)
    await supabase
      .from('amazon_accounts')
      .update({ 
        sync_status: 'syncing', 
        sync_progress: 0,
        sync_message: 'Initializing sync...',
        last_sync_error: null 
      })
      .eq('id', amazonAccountId)
      .eq('user_id', actualUserId)

    // Define background sync task
    const syncTask = async () => {
      console.log(`[Background Sync] Starting sync for account ${amazonAccountId}`)
      
      try {
        // Update sync message to indicate we're fetching account details
        supabase
          .from('amazon_accounts')
          .update({ 
            sync_message: 'Fetching account details...',
            sync_progress: 5
          })
          .eq('id', amazonAccountId)
          .eq('user_id', actualUserId)
          .then(() => {}).catch(err => console.error('Failed to update sync message:', err))
        
        // Get the Amazon account with encrypted credentials
        const { data: amazonAccount, error: accountError } = await supabase
          .from('amazon_accounts')
          .select('*')
          .eq('id', amazonAccountId)
          .eq('user_id', actualUserId)
          .single()

        if (accountError || !amazonAccount) {
          console.error('[Background Sync] Amazon account not found')
          return
        }

        console.log(`[Background Sync] Syncing Amazon account: ${amazonAccount.account_name} (${amazonAccount.payout_frequency} payouts)`)

        // Check rate limiting - Amazon Financial Events API: 0.5 requests/second (120 second minimum between calls)
        const lastSync = amazonAccount.last_sync ? new Date(amazonAccount.last_sync) : null
        const timeSinceLastSync = lastSync ? (Date.now() - lastSync.getTime()) / 1000 : Infinity
        const RATE_LIMIT_SECONDS = 120 // 2 minutes minimum between syncs
        
        if (timeSinceLastSync < RATE_LIMIT_SECONDS) {
          const waitTime = Math.ceil(RATE_LIMIT_SECONDS - timeSinceLastSync)
          console.log(`[Background Sync] ⏱️ Rate limit: Last sync was ${Math.floor(timeSinceLastSync)}s ago. Must wait ${waitTime}s more.`)
          return
        }

        // Check if access token needs refresh (expires within 5 minutes OR is null)
        const tokenExpiresAt = amazonAccount.token_expires_at ? new Date(amazonAccount.token_expires_at) : null
        const needsRefresh = !amazonAccount.encrypted_access_token || !tokenExpiresAt || (tokenExpiresAt.getTime() - Date.now()) < 300000

        let accessToken = amazonAccount.encrypted_access_token

        if (needsRefresh) {
          console.log('[Background Sync] Access token missing, expired, or expiring soon - refreshing...')
          const { data: refreshData, error: refreshError } = await supabase.functions.invoke('refresh-amazon-token', {
            body: { amazon_account_id: amazonAccountId }
          })

          if (refreshError || !refreshData?.access_token) {
            console.error('[Background Sync] Failed to refresh token:', refreshError)
            throw new Error(`Failed to refresh Amazon access token: ${refreshError?.message || 'Unknown error'}`)
          }

          accessToken = refreshData.access_token
          console.log('[Background Sync] ✅ Token refreshed successfully')
        } else {
          // Decrypt existing access token
          console.log('[Background Sync] Using existing access token, decrypting...')
          const { data: decryptedToken } = await supabase
            .rpc('decrypt_banking_credential', { encrypted_text: accessToken })
          accessToken = decryptedToken
          console.log('[Background Sync] ✅ Token decrypted successfully')
        }

        // Determine region and API endpoint
        const region = MARKETPLACE_REGIONS[amazonAccount.marketplace_id] || 'US'
        const apiEndpoint = AMAZON_SPAPI_ENDPOINTS[region]

        console.log(`[Background Sync] Using ${region} endpoint: ${apiEndpoint}`)

        const now = new Date()
        const transactionsToAdd = []
        const payoutsToAdd = []

        // Fetch financial events from Amazon SP-API with pagination
        try {
          const financialEventsUrl = `${apiEndpoint}/finances/v0/financialEvents`
          
          // Use incremental sync: fetch from last sync date, or last 30 days if first sync
          const startDate = new Date()
          if (amazonAccount.last_sync) {
            // Incremental: fetch from last sync with 1 day overlap to catch any delayed data
            startDate.setTime(new Date(amazonAccount.last_sync).getTime() - (24 * 60 * 60 * 1000))
            console.log(`[Background Sync] 📅 Incremental sync from: ${startDate.toISOString()}`)
          } else {
            // Initial sync: last 30 days only
            startDate.setDate(startDate.getDate() - 30)
            console.log(`[Background Sync] 📅 Initial sync - fetching last 30 days from: ${startDate.toISOString()}`)
          }

          let nextToken: string | undefined = undefined
          let pageCount = 0
          const maxPages = 200 // Increased to handle high-volume sellers (20k+ transactions)
          
          console.log('[Background Sync] Fetching financial events with pagination...')
          
          // Update progress: Starting data fetch (don't await to avoid blocking)
          supabase
            .from('amazon_accounts')
            .update({ 
              sync_progress: 10,
              sync_message: 'Connecting to Amazon API...'
            })
            .eq('id', amazonAccountId)
            .then(() => {})
            .catch(err => console.error('[Background Sync] Progress update error:', err))

          do {
            pageCount++
            console.log(`[Background Sync] 📄 Fetching page ${pageCount}... (${transactionsToAdd.length} transactions so far)`)
            
            // Update progress based on page count
            // Only update every 5 pages to reduce database writes and avoid blocking
            if (pageCount % 5 === 0) {
              // Progress from 10% to 70% based on pages (assuming max 200 pages)
              const progressPercentage = Math.min(10 + (pageCount / 200) * 60, 70)
              supabase
                .from('amazon_accounts')
                .update({ 
                  sync_progress: Math.round(progressPercentage),
                  sync_message: `Fetching page ${pageCount}... ${transactionsToAdd.length} transactions found`
                })
                .eq('id', amazonAccountId)
                .then(() => {})
                .catch(err => console.error('[Background Sync] Progress update error:', err))
            }

            // Build URL with pagination token if available
            let url = `${financialEventsUrl}?PostedAfter=${startDate.toISOString()}&MarketplaceId=${amazonAccount.marketplace_id}&MaxResultsPerPage=100`
            if (nextToken) {
              url += `&NextToken=${encodeURIComponent(nextToken)}`
            }

            const financialResponse = await fetch(url, {
              headers: {
                'x-amz-access-token': accessToken,
                'Content-Type': 'application/json',
              }
            })

            if (!financialResponse.ok) {
              const errorText = await financialResponse.text()
              console.error('[Background Sync] Financial events API error:', errorText)
              throw new Error(`Financial events API failed: ${financialResponse.status} - ${errorText}`)
            }

            const financialData = await financialResponse.json()
            
            // Extract NextToken for pagination
            nextToken = financialData.payload?.NextToken

            // Log what event types are available in this response
            const eventTypes = financialData.payload?.FinancialEvents || {}
            console.log('[Background Sync] 📦 Available event types:', Object.keys(eventTypes))
            console.log('[Background Sync] 📊 Event counts:', {
              shipments: (eventTypes.ShipmentEventList || []).length,
              refunds: (eventTypes.RefundEventList || []).length,
              reimbursements: (eventTypes.ShipmentSettleEventList || []).length,
              serviceFees: (eventTypes.ServiceFeeEventList || []).length,
              guaranteeClaims: (eventTypes.SAFETReimbursementEventList || []).length,
              chargebacks: (eventTypes.ChargebackEventList || []).length,
              adjustments: (eventTypes.AdjustmentEventList || []).length
            })

            // Parse shipment events (Orders/Sales)
            const shipmentEvents = financialData.payload?.FinancialEvents?.ShipmentEventList || []
            console.log(`[Background Sync] Processing ${shipmentEvents.length} shipment events...`)
            for (const shipment of shipmentEvents) {
              const orderId = shipment.AmazonOrderId
              const shipmentDate = shipment.PostedDate
              
              // Try to extract delivery date from shipment data
              const deliveryDate = shipment.EarliestDeliveryDate || shipment.LatestDeliveryDate || null
              
              console.log(`[Background Sync] Shipment ${orderId}: Posted=${shipmentDate}, Delivery=${deliveryDate || 'N/A'}`)
              
              // Process each item in the shipment
              let itemIndex = 0
              for (const item of (shipment.ShipmentItemList || [])) {
                itemIndex++
                const revenue = item.ItemChargeList?.reduce((sum: number, charge: any) => 
                  sum + (charge.ChargeAmount?.CurrencyAmount || 0), 0) || 0
                
                const fees = item.ItemFeeList?.reduce((sum: number, fee: any) => 
                  sum + (fee.FeeAmount?.CurrencyAmount || 0), 0) || 0

                if (revenue !== 0 || fees !== 0) {
                  // Create unique transaction ID by adding item index to handle duplicate SKUs
                  transactionsToAdd.push({
                    user_id: actualUserId,
                    amazon_account_id: amazonAccountId,
                    account_id: amazonAccount.account_id,
                    transaction_id: `${orderId}-${item.SellerSKU}-${itemIndex}`,
                    transaction_type: 'Order',
                    amount: revenue + fees, // Net amount
                    gross_amount: revenue,
                    delivery_date: deliveryDate,
                    currency_code: item.ItemChargeList?.[0]?.ChargeAmount?.CurrencyCode || 'USD',
                    transaction_date: shipmentDate,
                    order_id: orderId,
                    sku: item.SellerSKU,
                    marketplace_name: amazonAccount.marketplace_name,
                    raw_data: item,
                  })
                }
              }
            }

            // Parse refund events
            const refundEvents = financialData.payload?.FinancialEvents?.RefundEventList || []
            console.log(`[Background Sync] Processing ${refundEvents.length} refund events...`)
            for (const refund of refundEvents) {
              const orderId = refund.AmazonOrderId
              const refundDate = refund.PostedDate
              
              let refundItemIndex = 0
              for (const item of (refund.ShipmentItemList || [])) {
                refundItemIndex++
                const refundAmount = item.ItemChargeList?.reduce((sum: number, charge: any) => 
                  sum + (charge.ChargeAmount?.CurrencyAmount || 0), 0) || 0

                if (refundAmount !== 0) {
                  // Add item index to prevent duplicates
                  transactionsToAdd.push({
                    user_id: user.id,
                    amazon_account_id: amazonAccountId,
                    account_id: amazonAccount.account_id,
                    transaction_id: `REFUND-${orderId}-${item.SellerSKU}-${refundItemIndex}`,
                    transaction_type: 'Refund',
                    amount: -Math.abs(refundAmount),
                    gross_amount: -Math.abs(refundAmount),
                    currency_code: item.ItemChargeList?.[0]?.ChargeAmount?.CurrencyCode || 'USD',
                    transaction_date: refundDate,
                    order_id: orderId,
                    sku: item.SellerSKU,
                    marketplace_name: amazonAccount.marketplace_name,
                    raw_data: item,
                  })
                }
              }
            }

            // Parse reimbursement events (Amazon reimbursements for lost/damaged inventory)
            const reimbursementEvents = financialData.payload?.FinancialEvents?.ShipmentSettleEventList || []
            console.log(`[Background Sync] Processing ${reimbursementEvents.length} reimbursement settlement events...`)
            for (const settlement of reimbursementEvents) {
              const settlementDate = settlement.PostedDate
              const settlementId = settlement.SettlementId
              
              for (const item of (settlement.ShipmentItemList || [])) {
                const reimbursementAmount = item.ItemChargeList?.reduce((sum: number, charge: any) => 
                  sum + (charge.ChargeAmount?.CurrencyAmount || 0), 0) || 0

                if (reimbursementAmount !== 0) {
                  transactionsToAdd.push({
                    user_id: user.id,
                    amazon_account_id: amazonAccountId,
                    account_id: amazonAccount.account_id,
                    transaction_id: `REIMBURSE-${settlementId}-${item.SellerSKU}`,
                    transaction_type: 'Reimbursement',
                    amount: reimbursementAmount,
                    gross_amount: reimbursementAmount,
                    currency_code: item.ItemChargeList?.[0]?.ChargeAmount?.CurrencyCode || 'USD',
                    transaction_date: settlementDate,
                    settlement_id: settlementId,
                    sku: item.SellerSKU,
                    marketplace_name: amazonAccount.marketplace_name,
                    raw_data: item,
                  })
                }
              }
            }

            // Parse service fee events (subscription fees, etc.)
            const serviceFeeEvents = financialData.payload?.FinancialEvents?.ServiceFeeEventList || []
            console.log(`[Background Sync] Processing ${serviceFeeEvents.length} service fee events...`)
            for (const fee of serviceFeeEvents) {
              const feeAmount = fee.FeeList?.reduce((sum: number, f: any) => 
                sum + (f.FeeAmount?.CurrencyAmount || 0), 0) || 0

              if (feeAmount !== 0) {
                transactionsToAdd.push({
                  user_id: user.id,
                  amazon_account_id: amazonAccountId,
                  account_id: amazonAccount.account_id,
                  transaction_id: `FEE-${fee.SellerSKU || 'SERVICE'}-${fee.PostedDate}`,
                  transaction_type: 'ServiceFee',
                  amount: -Math.abs(feeAmount), // Fees are negative
                  gross_amount: -Math.abs(feeAmount),
                  currency_code: fee.FeeList?.[0]?.FeeAmount?.CurrencyCode || 'USD',
                  transaction_date: fee.PostedDate,
                  sku: fee.SellerSKU,
                  marketplace_name: amazonAccount.marketplace_name,
                  fee_description: fee.FeeDescription,
                  fee_type: fee.FeeType,
                  raw_data: fee,
                })
              }
            }

            // Parse adjustment events (manual adjustments, corrections)
            const adjustmentEvents = financialData.payload?.FinancialEvents?.AdjustmentEventList || []
            console.log(`[Background Sync] Processing ${adjustmentEvents.length} adjustment events...`)
            for (const adjustment of adjustmentEvents) {
              const adjustmentAmount = adjustment.AdjustmentAmount?.CurrencyAmount || 0

              if (adjustmentAmount !== 0) {
                transactionsToAdd.push({
                  user_id: user.id,
                  amazon_account_id: amazonAccountId,
                  account_id: amazonAccount.account_id,
                  transaction_id: `ADJ-${adjustment.AdjustmentType}-${adjustment.PostedDate}`,
                  transaction_type: 'Adjustment',
                  amount: adjustmentAmount,
                  gross_amount: adjustmentAmount,
                  currency_code: adjustment.AdjustmentAmount?.CurrencyCode || 'USD',
                  transaction_date: adjustment.PostedDate,
                  marketplace_name: amazonAccount.marketplace_name,
                  raw_data: adjustment,
                })
              }
            }

            // Parse SAFE-T claim reimbursements
            const safetEvents = financialData.payload?.FinancialEvents?.SAFETReimbursementEventList || []
            console.log(`[Background Sync] Processing ${safetEvents.length} SAFE-T reimbursement events...`)
            for (const safet of safetEvents) {
              const reimbursementAmount = safet.ReimbursedAmount?.CurrencyAmount || 0

              if (reimbursementAmount !== 0) {
                transactionsToAdd.push({
                  user_id: user.id,
                  amazon_account_id: amazonAccountId,
                  account_id: amazonAccount.account_id,
                  transaction_id: `SAFET-${safet.SAFETClaimId}`,
                  transaction_type: 'SAFETReimbursement',
                  amount: reimbursementAmount,
                  gross_amount: reimbursementAmount,
                  currency_code: safet.ReimbursedAmount?.CurrencyCode || 'USD',
                  transaction_date: safet.PostedDate,
                  marketplace_name: amazonAccount.marketplace_name,
                  raw_data: safet,
                })
              }
            }

            // Parse chargeback events
            const chargebackEvents = financialData.payload?.FinancialEvents?.ChargebackEventList || []
            console.log(`[Background Sync] Processing ${chargebackEvents.length} chargeback events...`)
            for (const chargeback of chargebackEvents) {
              const chargebackAmount = chargeback.ChargebackAmount?.CurrencyAmount || 0

              if (chargebackAmount !== 0) {
                transactionsToAdd.push({
                  user_id: user.id,
                  amazon_account_id: amazonAccountId,
                  account_id: amazonAccount.account_id,
                  transaction_id: `CHARGEBACK-${chargeback.AmazonOrderId || chargeback.PostedDate}`,
                  transaction_type: 'Chargeback',
                  amount: -Math.abs(chargebackAmount),
                  gross_amount: -Math.abs(chargebackAmount),
                  currency_code: chargeback.ChargebackAmount?.CurrencyCode || 'USD',
                  transaction_date: chargeback.PostedDate,
                  order_id: chargeback.AmazonOrderId,
                  marketplace_name: amazonAccount.marketplace_name,
                  raw_data: chargeback,
                })
              }
            }

            // Parse guarantee claim events (A-to-z)
            const guaranteeClaimEvents = financialData.payload?.FinancialEvents?.GuaranteeClaimEventList || []
            console.log(`[Background Sync] Processing ${guaranteeClaimEvents.length} guarantee claim events...`)
            for (const claim of guaranteeClaimEvents) {
              const claimAmount = claim.ClaimAmount?.CurrencyAmount || 0

              if (claimAmount !== 0) {
                transactionsToAdd.push({
                  user_id: user.id,
                  amazon_account_id: amazonAccountId,
                  account_id: amazonAccount.account_id,
                  transaction_id: `CLAIM-${claim.ClaimId || claim.PostedDate}`,
                  transaction_type: 'GuaranteeClaim',
                  amount: -Math.abs(claimAmount),
                  gross_amount: -Math.abs(claimAmount),
                  currency_code: claim.ClaimAmount?.CurrencyCode || 'USD',
                  transaction_date: claim.PostedDate,
                  order_id: claim.AmazonOrderId,
                  marketplace_name: amazonAccount.marketplace_name,
                  raw_data: claim,
                })
              }
            }

            // Parse Sponsored Products ad payment events
            const productAdsEvents = financialData.payload?.FinancialEvents?.ProductAdsPaymentEventList || []
            console.log(`[Background Sync] Processing ${productAdsEvents.length} Sponsored Products ad payment events...`)
            for (const ad of productAdsEvents) {
              const adAmount = ad.BaseValue?.CurrencyAmount || 0

              if (adAmount !== 0) {
                transactionsToAdd.push({
                  user_id: user.id,
                  amazon_account_id: amazonAccountId,
                  account_id: amazonAccount.account_id,
                  transaction_id: `ADS-${ad.TransactionType}-${ad.PostedDate}`,
                  transaction_type: 'SponsoredAds',
                  amount: -Math.abs(adAmount), // Ads are costs
                  gross_amount: -Math.abs(adAmount),
                  currency_code: ad.BaseValue?.CurrencyCode || 'USD',
                  transaction_date: ad.PostedDate,
                  marketplace_name: amazonAccount.marketplace_name,
                  description: ad.TransactionType,
                  raw_data: ad,
                })
              }
            }

            // Parse FBA liquidation events
            const fbaLiquidationEvents = financialData.payload?.FinancialEvents?.FBALiquidationEventList || []
            console.log(`[Background Sync] Processing ${fbaLiquidationEvents.length} FBA liquidation events...`)
            for (const liquidation of fbaLiquidationEvents) {
              const liquidationAmount = liquidation.LiquidationProceedsAmount?.CurrencyAmount || 0

              if (liquidationAmount !== 0) {
                transactionsToAdd.push({
                  user_id: user.id,
                  amazon_account_id: amazonAccountId,
                  account_id: amazonAccount.account_id,
                  transaction_id: `LIQUIDATION-${liquidation.PostedDate}`,
                  transaction_type: 'FBALiquidation',
                  amount: liquidationAmount,
                  gross_amount: liquidationAmount,
                  currency_code: liquidation.LiquidationProceedsAmount?.CurrencyCode || 'USD',
                  transaction_date: liquidation.PostedDate,
                  marketplace_name: amazonAccount.marketplace_name,
                  raw_data: liquidation,
                })
              }
            }

            // Parse removal shipment events
            const removalEvents = financialData.payload?.FinancialEvents?.RemovalShipmentEventList || []
            console.log(`[Background Sync] Processing ${removalEvents.length} removal shipment events...`)
            for (const removal of removalEvents) {
              for (const item of (removal.RemovalShipmentItemList || [])) {
                const removalFee = item.RemovalFee?.CurrencyAmount || 0

                if (removalFee !== 0) {
                  transactionsToAdd.push({
                    user_id: user.id,
                    amazon_account_id: amazonAccountId,
                    account_id: amazonAccount.account_id,
                    transaction_id: `REMOVAL-${removal.RemovalOrderId}-${item.SellerSKU}`,
                    transaction_type: 'RemovalShipment',
                    amount: -Math.abs(removalFee), // Removal fees are costs
                    gross_amount: -Math.abs(removalFee),
                    currency_code: item.RemovalFee?.CurrencyCode || 'USD',
                    transaction_date: removal.PostedDate,
                    sku: item.SellerSKU,
                    marketplace_name: amazonAccount.marketplace_name,
                    raw_data: item,
                  })
                }
              }
            }

            // Parse coupon payment events
            const couponEvents = financialData.payload?.FinancialEvents?.CouponPaymentEventList || []
            console.log(`[Background Sync] Processing ${couponEvents.length} coupon payment events...`)
            for (const coupon of couponEvents) {
              const couponAmount = coupon.TotalAmount?.CurrencyAmount || 0

              if (couponAmount !== 0) {
                transactionsToAdd.push({
                  user_id: user.id,
                  amazon_account_id: amazonAccountId,
                  account_id: amazonAccount.account_id,
                  transaction_id: `COUPON-${coupon.CouponId || coupon.PostedDate}`,
                  transaction_type: 'CouponPayment',
                  amount: couponAmount,
                  gross_amount: couponAmount,
                  currency_code: coupon.TotalAmount?.CurrencyCode || 'USD',
                  transaction_date: coupon.PostedDate,
                  marketplace_name: amazonAccount.marketplace_name,
                  raw_data: coupon,
                })
              }
            }

            // Parse rental transaction events
            const rentalEvents = financialData.payload?.FinancialEvents?.RentalTransactionEventList || []
            console.log(`[Background Sync] Processing ${rentalEvents.length} rental transaction events...`)
            for (const rental of rentalEvents) {
              const rentalAmount = rental.RentalChargeList?.reduce((sum: number, charge: any) => 
                sum + (charge.ChargeAmount?.CurrencyAmount || 0), 0) || 0

              if (rentalAmount !== 0) {
                transactionsToAdd.push({
                  user_id: user.id,
                  amazon_account_id: amazonAccountId,
                  account_id: amazonAccount.account_id,
                  transaction_id: `RENTAL-${rental.AmazonOrderId || rental.PostedDate}`,
                  transaction_type: 'RentalTransaction',
                  amount: rentalAmount,
                  gross_amount: rentalAmount,
                  currency_code: rental.RentalChargeList?.[0]?.ChargeAmount?.CurrencyCode || 'USD',
                  transaction_date: rental.PostedDate,
                  order_id: rental.AmazonOrderId,
                  marketplace_name: amazonAccount.marketplace_name,
                  raw_data: rental,
                })
              }
            }

            // Parse loan servicing events
            const loanEvents = financialData.payload?.FinancialEvents?.LoanServicingEventList || []
            console.log(`[Background Sync] Processing ${loanEvents.length} loan servicing events...`)
            for (const loan of loanEvents) {
              const loanAmount = loan.LoanAmount?.CurrencyAmount || 0

              if (loanAmount !== 0) {
                transactionsToAdd.push({
                  user_id: user.id,
                  amazon_account_id: amazonAccountId,
                  account_id: amazonAccount.account_id,
                  transaction_id: `LOAN-${loan.LoanType}-${loan.PostedDate}`,
                  transaction_type: 'LoanServicing',
                  amount: loanAmount,
                  gross_amount: loanAmount,
                  currency_code: loan.LoanAmount?.CurrencyCode || 'USD',
                  transaction_date: loan.PostedDate,
                  description: loan.LoanType,
                  marketplace_name: amazonAccount.marketplace_name,
                  raw_data: loan,
                })
              }
            }

            // Parse tax withholding events
            const taxWithholdingEvents = financialData.payload?.FinancialEvents?.TaxWithholdingEventList || []
            console.log(`[Background Sync] Processing ${taxWithholdingEvents.length} tax withholding events...`)
            for (const tax of taxWithholdingEvents) {
              const taxAmount = tax.TaxWithholdingAmount?.CurrencyAmount || 0

              if (taxAmount !== 0) {
                transactionsToAdd.push({
                  user_id: user.id,
                  amazon_account_id: amazonAccountId,
                  account_id: amazonAccount.account_id,
                  transaction_id: `TAX-${tax.PostedDate}`,
                  transaction_type: 'TaxWithholding',
                  amount: -Math.abs(taxAmount), // Tax is a deduction
                  gross_amount: -Math.abs(taxAmount),
                  currency_code: tax.TaxWithholdingAmount?.CurrencyCode || 'USD',
                  transaction_date: tax.PostedDate,
                  marketplace_name: amazonAccount.marketplace_name,
                  raw_data: tax,
                })
              }
            }

            console.log(`[Background Sync] ✓ Page ${pageCount}: Added ${transactionsToAdd.length} transactions so far`)

            // Amazon rate limit: 0.6 seconds per request (safer than 0.5)
            // Wait 1 second between pagination requests (reduced from 2.4s)
            if (nextToken && pageCount < maxPages) {
              console.log('[Background Sync] ⏱️ Waiting 1 second before next page...')
              await new Promise(resolve => setTimeout(resolve, 1000))
            }

          } while (nextToken && pageCount < maxPages)

          if (pageCount >= maxPages && nextToken) {
            console.log(`[Background Sync] ⚠️ Reached max pages (${maxPages}). More data available - will continue on next sync.`)
            // Update with warning message
            supabase
              .from('amazon_accounts')
              .update({ 
                sync_message: `Fetched ${pageCount} pages (${transactionsToAdd.length} transactions). More data available - sync again to continue.`
              })
              .eq('id', amazonAccountId)
              .then(() => {})
              .catch(err => console.error('[Background Sync] Warning update error:', err))
          }

          console.log(`[Background Sync] ✅ Fetched all pages: ${pageCount} pages total`)

        } catch (error) {
          console.error('[Background Sync] Error fetching financial events:', error)
          throw error
        }

        // Insert or update transactions in database with upsert
        console.log(`[Background Sync] Upserting ${transactionsToAdd.length} transactions...`)
        
        // Update progress: Processing data (don't await to avoid blocking)
        supabase
          .from('amazon_accounts')
          .update({ 
            sync_progress: 75,
            sync_message: `Processing ${transactionsToAdd.length} transactions...`
          })
          .eq('id', amazonAccountId)
          .then(() => {})
          .catch(err => console.error('[Background Sync] Progress update error:', err))
        
        if (transactionsToAdd.length > 0) {
          const { error: txError } = await supabase
            .from('amazon_transactions')
            .upsert(transactionsToAdd, {
              onConflict: 'transaction_id',
              ignoreDuplicates: false
            })

          if (txError) {
            console.error('[Background Sync] Error upserting transactions:', txError)
            throw txError
          }
          console.log(`[Background Sync] ✅ ${transactionsToAdd.length} transactions upserted`)
        }

        // Get current transaction count for this account
        const { count: totalTransactions } = await supabase
          .from('amazon_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('amazon_account_id', amazonAccountId)

        // Determine if initial sync is complete (more than 0 transactions and no next page)
        const shouldComplete = (totalTransactions ?? 0) > 0 && !nextToken

        // Update account sync status to idle (completed)
        await supabase
          .from('amazon_accounts')
          .update({
            last_sync: now.toISOString(),
            transaction_count: totalTransactions || 0,
            initial_sync_complete: shouldComplete || amazonAccount.initial_sync_complete,
            sync_status: 'idle',
            sync_progress: 100,
            sync_message: `Sync complete! ${totalTransactions} total transactions`,
            last_sync_error: null,
            updated_at: now.toISOString()
          })
          .eq('id', amazonAccountId)
          .eq('user_id', actualUserId)

        console.log(`[Background Sync] ✅ Sync complete: ${totalTransactions} total transactions`)
        console.log(`[Background Sync] Added ${transactionsToAdd.length} transactions, ${payoutsToAdd.length} payouts`)
      } catch (error) {
        console.error('[Background Sync] Error during sync:', error)
        // Update account with error status
        await supabase
          .from('amazon_accounts')
          .update({ 
            sync_status: 'error',
            sync_progress: 0,
            sync_message: error instanceof Error ? error.message : 'Sync failed',
            last_sync_error: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', amazonAccountId)
          .eq('user_id', actualUserId)
      }
    }

    // Start background task using EdgeRuntime.waitUntil
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(syncTask())
      console.log(`✅ Sync started in background for account ${amazonAccountId}`)
    } else {
      // Fallback for local development - run immediately but don't wait
      syncTask().catch(err => console.error('Background sync error:', err))
    }

    // Return immediate response to frontend
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Amazon data sync started in background',
        accountId: amazonAccountId,
        status: 'processing'
      }),
      { 
        status: 202, // 202 Accepted - indicates processing has started
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in sync-amazon-data function:', error)
    
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
