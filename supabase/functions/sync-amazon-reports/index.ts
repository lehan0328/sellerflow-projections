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

    // Check if token is expired and refresh if needed
    const tokenExpiresAt = new Date(account.access_token_expires_at)
    const now = new Date()
    const bufferMinutes = 5 // Refresh if expiring within 5 minutes
    
    if (tokenExpiresAt.getTime() - now.getTime() < bufferMinutes * 60 * 1000) {
      console.log('[REPORTS] Access token expired, refreshing...')
      
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke('refresh-amazon-token', {
        body: { amazon_account_id: accountId }
      })
      
      if (refreshError) {
        throw new Error(`Token refresh failed: ${refreshError.message}`)
      }
      
      console.log('[REPORTS] Token refreshed successfully')
      
      // Re-fetch account with new token
      const { data: refreshedAccount, error: refetchError } = await supabase
        .from('amazon_accounts')
        .select('*')
        .eq('id', accountId)
        .single()
      
      if (refetchError || !refreshedAccount) {
        throw new Error('Failed to fetch refreshed account')
      }
      
      account.access_token = refreshedAccount.access_token
    }

    const region = MARKETPLACE_REGIONS[account.marketplace_id] || 'US'
    const endpoint = AMAZON_SPAPI_ENDPOINTS[region]

    // Step 1: Request a report for the last 30 days (Amazon's max for this report type)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    console.log(`[REPORTS] Requesting report from ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Helper function to make API request with automatic token refresh on 403
    const makeAuthenticatedRequest = async (url: string, options: any, retryCount = 0): Promise<Response> => {
      const response = await fetch(url, options)
      
      // If 403 and haven't retried yet, refresh token and retry
      if (response.status === 403 && retryCount === 0) {
        console.log('[REPORTS] Got 403, refreshing token and retrying...')
        
        const { data: refreshData, error: refreshError } = await supabase.functions.invoke('refresh-amazon-token', {
          body: { amazon_account_id: accountId }
        })
        
        if (refreshError || !refreshData?.access_token) {
          const errorText = await response.text()
          throw new Error(`Token refresh failed after 403: ${errorText}`)
        }
        
        console.log('[REPORTS] Token refreshed, retrying request...')
        
        // Update the token in options and retry
        options.headers['x-amz-access-token'] = refreshData.access_token
        options.headers['Authorization'] = `Bearer ${refreshData.access_token}`
        account.access_token = refreshData.access_token
        
        return makeAuthenticatedRequest(url, options, retryCount + 1)
      }
      
      return response
    }

    const reportRequestBody = {
      reportType,
      marketplaceIds: [account.marketplace_id],
      dataStartTime: startDate.toISOString(),
      dataEndTime: endDate.toISOString(),
    }

    const createReportResponse = await makeAuthenticatedRequest(
      `${endpoint}/reports/2021-06-30/reports`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'x-amz-access-token': account.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportRequestBody),
      }
    )

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

      const statusResponse = await makeAuthenticatedRequest(
        `${endpoint}/reports/2021-06-30/reports/${reportId}`,
        {
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'x-amz-access-token': account.access_token,
          },
        }
      )

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
    const docResponse = await makeAuthenticatedRequest(
      `${endpoint}/reports/2021-06-30/documents/${reportDocumentId}`,
      {
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'x-amz-access-token': account.access_token,
        },
      }
    )

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

    let reportContent: string
    
    // Decompress if needed
    if (compressionAlgorithm === 'GZIP') {
      console.log('[REPORTS] GZIP compression detected, decompressing...')
      
      // Get the response as an array buffer
      const compressedData = await downloadResponse.arrayBuffer()
      
      // Create a decompression stream
      const decompressedStream = new ReadableStream({
        start(controller) {
          const decompressor = new DecompressionStream('gzip')
          const writer = decompressor.writable.getWriter()
          writer.write(new Uint8Array(compressedData))
          writer.close()
          
          const reader = decompressor.readable.getReader()
          const pump = () => {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close()
                return
              }
              controller.enqueue(value)
              pump()
            })
          }
          pump()
        }
      })
      
      // Read the decompressed data
      const decompressedData = await new Response(decompressedStream).arrayBuffer()
      reportContent = new TextDecoder().decode(decompressedData)
      
      console.log('[REPORTS] Decompression complete')
    } else {
      reportContent = await downloadResponse.text()
    }

    console.log(`[REPORTS] Downloaded ${reportContent.length} bytes`)

    // Step 5: Parse CSV and aggregate at ORDER level for forecasting
    const lines = reportContent.split('\n')
    const headers = lines[0].split('\t')
    
    console.log(`[REPORTS] Parsing ${lines.length - 1} rows with headers:`, headers.slice(0, 10))

    // Group by order_id to aggregate order-level data (not SKU-level)
    const orderMap = new Map()
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split('\t')
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      const orderId = row['amazon-order-id'] || row['AmazonOrderId']
      if (!orderId) continue
      
      // Parse financial data
      const itemPrice = parseFloat(row['item-price'] || '0')
      const itemTax = parseFloat(row['item-tax'] || '0')
      const shippingPrice = parseFloat(row['shipping-price'] || '0')
      const shippingTax = parseFloat(row['shipping-tax'] || '0')
      const giftWrap = parseFloat(row['gift-wrap-price'] || '0')
      const giftWrapTax = parseFloat(row['gift-wrap-tax'] || '0')
      const itemPromo = parseFloat(row['item-promotion-discount'] || '0')
      const shipPromo = parseFloat(row['ship-promotion-discount'] || '0')
      const quantity = parseInt(row['quantity-purchased'] || '1')
      
      // Aggregate at order level for forecasting
      if (!orderMap.has(orderId)) {
        orderMap.set(orderId, {
          amazon_account_id: accountId,
          user_id: account.user_id,
          transaction_date: row['purchase-date'] || row['PurchaseDate'],
          amazon_order_id: orderId,
          transaction_type: 'Order',
          currency: row['currency'] || 'USD',
          total_revenue: 0,
          total_tax: 0,
          total_shipping: 0,
          total_promotions: 0,
          item_count: 0,
          order_status: row['order-status'],
          raw_data: {
            purchase_date: row['purchase-date'],
            sales_channel: row['sales-channel'],
            fulfillment_channel: row['fulfillment-channel'],
          }
        })
      }
      
      const order = orderMap.get(orderId)
      order.total_revenue += itemPrice
      order.total_tax += itemTax + shippingTax + giftWrapTax
      order.total_shipping += shippingPrice + giftWrap
      order.total_promotions += Math.abs(itemPromo) + Math.abs(shipPromo)
      order.item_count += quantity
    }
    
    // Convert to transactions array and calculate final amounts
    const transactions: any[] = Array.from(orderMap.values()).map(order => ({
      ...order,
      amount: order.total_revenue + order.total_tax + order.total_shipping - order.total_promotions,
      sku: `ORDER_${order.item_count}_ITEMS`, // Aggregate placeholder
      quantity: order.item_count,
    }))

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
