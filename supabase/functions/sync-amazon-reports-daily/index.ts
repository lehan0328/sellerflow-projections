import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AMAZON_SPAPI_ENDPOINTS = {
  'na': 'https://sellingpartnerapi-na.amazon.com',
  'eu': 'https://sellingpartnerapi-eu.amazon.com',
  'fe': 'https://sellingpartnerapi-fe.amazon.com',
}

const MARKETPLACE_REGIONS = {
  'ATVPDKIKX0DER': 'na', // US
  'A2EUQ1WTGCTBG2': 'na', // Canada
  'A1AM78C64UM0Y8': 'na', // Mexico
  'A2Q3Y263D00KWC': 'eu', // Brazil
  'A1PA6795UKMFR9': 'eu', // Germany
  'A1RKKUPIHCS9HS': 'eu', // Spain
  'A13V1IB3VIYZZH': 'eu', // France
  'APJ6JRA9NG5V4': 'eu', // Italy
  'A1F83G8C2ARO7P': 'eu', // UK
  'A21TJRUUN4KGV': 'eu', // India
  'A19VAU5U5O7RUS': 'fe', // Singapore
  'A39IBJ37TRP1C6': 'fe', // Australia
  'A1VC38T7YXB528': 'fe', // Japan
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { amazonAccountId, days = 14 } = await req.json()

    if (!amazonAccountId) {
      throw new Error('Amazon account ID is required')
    }

    console.log(`[REPORTS] Starting order report sync for account ${amazonAccountId} (last ${days} days)`)

    // Fetch account details
    const { data: account, error: accountError } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('id', amazonAccountId)
      .single()

    if (accountError || !account) {
      throw new Error('Amazon account not found')
    }

    // Get region from marketplace
    const region = MARKETPLACE_REGIONS[account.marketplace_id] || 'na'
    const endpoint = AMAZON_SPAPI_ENDPOINTS[region]

    // Decrypt access token
    const { data: secretData } = await supabase.rpc('decrypt_banking_credential', {
      encrypted_text: account.encrypted_access_token
    })
    
    const accessToken = secretData || account.encrypted_access_token

    // Calculate date range (last 14 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    console.log(`[REPORTS] Requesting report from ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Step 1: Request report generation
    const createReportResponse = await fetch(`${endpoint}/reports/2021-06-30/reports`, {
      method: 'POST',
      headers: {
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportType: 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL',
        dataStartTime: startDate.toISOString(),
        dataEndTime: endDate.toISOString(),
        marketplaceIds: [account.marketplace_id],
      })
    })

    if (!createReportResponse.ok) {
      const errorText = await createReportResponse.text()
      throw new Error(`Failed to create report: ${createReportResponse.status} - ${errorText}`)
    }

    const reportRequest = await createReportResponse.json()
    const reportId = reportRequest.reportId

    console.log(`[REPORTS] Report requested: ${reportId}`)

    // Step 2: Poll for report completion (max 15 minutes)
    let reportDocument = null
    const maxAttempts = 30 // 30 attempts x 30 seconds = 15 minutes
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 30000)) // Wait 30 seconds

      const reportStatusResponse = await fetch(`${endpoint}/reports/2021-06-30/reports/${reportId}`, {
        headers: {
          'x-amz-access-token': accessToken,
        }
      })

      if (!reportStatusResponse.ok) {
        console.error('[REPORTS] Failed to check report status')
        continue
      }

      const reportStatus = await reportStatusResponse.json()
      console.log(`[REPORTS] Report status: ${reportStatus.processingStatus} (attempt ${attempt + 1}/${maxAttempts})`)

      if (reportStatus.processingStatus === 'DONE') {
        reportDocument = reportStatus.reportDocumentId
        break
      } else if (reportStatus.processingStatus === 'FATAL' || reportStatus.processingStatus === 'CANCELLED') {
        throw new Error(`Report generation failed: ${reportStatus.processingStatus}`)
      }
    }

    if (!reportDocument) {
      throw new Error('Report generation timeout after 15 minutes')
    }

    console.log(`[REPORTS] Report ready: ${reportDocument}`)

    // Step 3: Get report download URL
    const documentResponse = await fetch(`${endpoint}/reports/2021-06-30/documents/${reportDocument}`, {
      headers: {
        'x-amz-access-token': accessToken,
      }
    })

    if (!documentResponse.ok) {
      throw new Error('Failed to get report document URL')
    }

    const documentData = await documentResponse.json()
    const downloadUrl = documentData.url

    console.log('[REPORTS] Downloading report...')

    // Step 4: Download report CSV
    const csvResponse = await fetch(downloadUrl)
    if (!csvResponse.ok) {
      throw new Error('Failed to download report')
    }

    const csvText = await csvResponse.text()
    const lines = csvText.split('\n')
    const headers = lines[0].split('\t')

    console.log(`[REPORTS] Parsing ${lines.length - 1} orders...`)

    // Find column indices
    const orderIdIdx = headers.indexOf('amazon-order-id')
    const purchaseDateIdx = headers.indexOf('purchase-date')
    const deliveryDateIdx = headers.indexOf('estimated-delivery-date')
    const itemPriceIdx = headers.indexOf('item-price')
    const itemTaxIdx = headers.indexOf('item-tax')
    const shippingPriceIdx = headers.indexOf('shipping-price')
    const promotionDiscountIdx = headers.indexOf('promotion-discount')

    // Parse transactions
    const transactions = []
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue

      const cols = lines[i].split('\t')
      
      const orderId = cols[orderIdIdx]
      const purchaseDate = cols[purchaseDateIdx]
      const deliveryDate = cols[deliveryDateIdx]
      const itemPrice = parseFloat(cols[itemPriceIdx] || '0')
      const itemTax = parseFloat(cols[itemTaxIdx] || '0')
      const shippingPrice = parseFloat(cols[shippingPriceIdx] || '0')
      const promotionDiscount = parseFloat(cols[promotionDiscountIdx] || '0')

      if (!orderId || !deliveryDate) continue

      // Calculate net amount (gross - tax - discounts)
      const netAmount = itemPrice - itemTax - promotionDiscount

      transactions.push({
        amazon_account_id: amazonAccountId,
        user_id: account.user_id,
        account_id: account.account_id,
        transaction_id: orderId,
        transaction_type: 'Order',
        transaction_date: new Date(purchaseDate).toISOString(),
        delivery_date: new Date(deliveryDate).toISOString(),
        amount: netAmount,
        description: `Order ${orderId}`,
        created_at: new Date().toISOString(),
      })
    }

    console.log(`[REPORTS] Parsed ${transactions.length} valid orders with delivery dates`)

    // Step 5: Upsert to database
    if (transactions.length > 0) {
      const { error: upsertError } = await supabase
        .from('amazon_transactions')
        .upsert(transactions, {
          onConflict: 'transaction_id,amazon_account_id',
          ignoreDuplicates: false
        })

      if (upsertError) {
        console.error('[REPORTS] Failed to save transactions:', upsertError)
        throw upsertError
      }

      console.log('[REPORTS] ✅ Transactions saved to database')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        ordersCount: transactions.length,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[REPORTS] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
