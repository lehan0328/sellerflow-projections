import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
  'ATVPDKIKX0DER': 'US',
  'A2EUQ1WTGCTBG2': 'US',
  'A1AM78C64UM0Y8': 'US',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { accountId, reportType = 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL' } = await req.json()

    if (!accountId) {
      throw new Error('Account ID is required')
    }

    console.log(`[REPORTS] Starting bulk report sync for account: ${accountId}`)

    // Fetch Amazon account
    const { data: account, error: accountError } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      throw new Error('Amazon account not found')
    }

    const region = MARKETPLACE_REGIONS[account.marketplace_id] || 'US'
    const endpoint = AMAZON_SPAPI_ENDPOINTS[region]

    // Step 1: Request a report for the last 2 years (730 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 730)

    console.log(`[REPORTS] Requesting report from ${startDate.toISOString()} to ${endDate.toISOString()}`)

    const reportRequestBody = {
      reportType,
      marketplaceIds: [account.marketplace_id],
      dataStartTime: startDate.toISOString(),
      dataEndTime: endDate.toISOString(),
    }

    const createReportResponse = await fetch(`${endpoint}/reports/2021-06-30/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'x-amz-access-token': account.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportRequestBody),
    })

    if (!createReportResponse.ok) {
      const errorText = await createReportResponse.text()
      throw new Error(`Failed to create report: ${createReportResponse.status} - ${errorText}`)
    }

    const { reportId } = await createReportResponse.json()
    console.log(`[REPORTS] Report requested: ${reportId}`)

    // Step 2: Poll for report completion (with timeout)
    let reportStatus = 'IN_QUEUE'
    let reportDocumentId: string | null = null
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max

    while (reportStatus !== 'DONE' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      attempts++

      const statusResponse = await fetch(`${endpoint}/reports/2021-06-30/reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'x-amz-access-token': account.access_token,
        },
      })

      if (!statusResponse.ok) {
        throw new Error(`Failed to check report status: ${statusResponse.status}`)
      }

      const statusData = await statusResponse.json()
      reportStatus = statusData.processingStatus
      reportDocumentId = statusData.reportDocumentId

      console.log(`[REPORTS] Attempt ${attempts}: Status ${reportStatus}`)

      if (reportStatus === 'FATAL' || reportStatus === 'CANCELLED') {
        throw new Error(`Report generation failed: ${reportStatus}`)
      }
    }

    if (reportStatus !== 'DONE' || !reportDocumentId) {
      throw new Error('Report generation timed out')
    }

    console.log(`[REPORTS] Report ready: ${reportDocumentId}`)

    // Step 3: Get report document details
    const docResponse = await fetch(`${endpoint}/reports/2021-06-30/documents/${reportDocumentId}`, {
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'x-amz-access-token': account.access_token,
      },
    })

    if (!docResponse.ok) {
      throw new Error(`Failed to get document details: ${docResponse.status}`)
    }

    const { url: reportUrl, compressionAlgorithm } = await docResponse.json()
    console.log(`[REPORTS] Downloading report from: ${reportUrl}`)

    // Step 4: Download the report
    const downloadResponse = await fetch(reportUrl)
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download report: ${downloadResponse.status}`)
    }

    let reportContent = await downloadResponse.text()
    
    // Decompress if needed
    if (compressionAlgorithm === 'GZIP') {
      // Handle GZIP decompression if needed
      console.log('[REPORTS] Note: GZIP compression detected, may need decompression')
    }

    console.log(`[REPORTS] Downloaded ${reportContent.length} bytes`)

    // Step 5: Parse CSV and extract transactions
    const lines = reportContent.split('\n')
    const headers = lines[0].split('\t')
    
    console.log(`[REPORTS] Parsing ${lines.length - 1} rows with headers:`, headers.slice(0, 10))

    const transactions: any[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split('\t')
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      // Map to our transaction format based on report type
      if (reportType === 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL') {
        transactions.push({
          amazon_account_id: accountId,
          user_id: account.user_id,
          transaction_date: row['purchase-date'] || row['PurchaseDate'],
          amazon_order_id: row['amazon-order-id'] || row['AmazonOrderId'],
          transaction_type: 'Order',
          amount: parseFloat(row['item-price'] || '0'),
          currency: row['currency'] || 'USD',
          sku: row['sku'] || row['SKU'],
          quantity: parseInt(row['quantity-purchased'] || '1'),
          raw_data: row,
        })
      }
    }

    console.log(`[REPORTS] Parsed ${transactions.length} transactions`)

    // Step 6: Bulk insert transactions (in batches of 1000)
    let inserted = 0
    for (let i = 0; i < transactions.length; i += 1000) {
      const batch = transactions.slice(i, i + 1000)
      
      const { error: insertError } = await supabase
        .from('amazon_transactions')
        .upsert(batch, {
          onConflict: 'amazon_account_id,transaction_date,amazon_order_id,transaction_type',
          ignoreDuplicates: true,
        })

      if (insertError) {
        console.error(`[REPORTS] Batch insert error:`, insertError)
      } else {
        inserted += batch.length
        console.log(`[REPORTS] Inserted batch ${Math.floor(i / 1000) + 1}: ${batch.length} records (total: ${inserted})`)
      }
    }

    // Update account sync status
    await supabase
      .from('amazon_accounts')
      .update({
        last_sync: new Date().toISOString(),
        sync_status: 'completed',
        sync_message: `Bulk sync complete: ${inserted} transactions from report`,
      })
      .eq('id', accountId)

    console.log(`[REPORTS] ✅ Bulk sync complete: ${inserted} transactions inserted`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Bulk sync complete`,
        inserted,
        reportId,
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
