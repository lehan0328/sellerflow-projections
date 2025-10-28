# Amazon Selling Partner API (SP-API) Reference Guide

## Overview
This document contains the complete reference for integrating with Amazon's Selling Partner API, including endpoints, authentication, rate limits, delays, and best practices.

---

## Authentication

### OAuth Token Flow

```javascript
// Token Exchange Endpoint
POST https://api.amazon.com/auth/o2/token

Headers:
  Content-Type: application/x-www-form-urlencoded

Body:
  grant_type=authorization_code
  code={authorization_code}
  client_id={your_client_id}
  client_secret={your_client_secret}
  redirect_uri={your_redirect_uri}
```

### Token Refresh

```javascript
// Refresh Token Endpoint
POST https://api.amazon.com/auth/o2/token

Headers:
  Content-Type: application/x-www-form-urlencoded

Body:
  grant_type=refresh_token
  refresh_token={refresh_token}
  client_id={your_client_id}
  client_secret={your_client_secret}

Response:
{
  "access_token": "Atza|...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "Atzr|..."
}
```

**IMPORTANT:** Tokens expire after 1 hour. Always check expiration before API calls.

---

## Regional Endpoints

```javascript
const AMAZON_SPAPI_ENDPOINTS = {
  'US': 'https://sellingpartnerapi-na.amazon.com',
  'EU': 'https://sellingpartnerapi-eu.amazon.com',
  'FE': 'https://sellingpartnerapi-fe.amazon.com'
}

const MARKETPLACE_REGIONS = {
  'ATVPDKIKX0DER': 'US',  // Amazon.com (US)
  'A2EUQ1WTGCTBG2': 'US', // Amazon.ca (Canada)
  'A1AM78C64UM0Y8': 'US'  // Amazon.com.mx (Mexico)
}
```

---

## Core API Endpoints

### 1. Settlements (Payouts)

#### List Financial Event Groups (Settlements)

```javascript
GET /finances/v0/financialEventGroups

Required Headers:
  Authorization: Bearer {access_token}
  x-amz-access-token: {access_token}

Query Parameters:
  FinancialEventGroupStartedAfter: ISO8601 timestamp (e.g., 2024-01-01T00:00:00Z)
  FinancialEventGroupStartedBefore: ISO8601 timestamp
  MaxResultsPerPage: integer (max 100)
  NextToken: string (for pagination)

Response:
{
  "payload": {
    "FinancialEventGroupList": [
      {
        "FinancialEventGroupId": "22YgYW55IGNhcm5hbCBwbGVhEXAMPLE",
        "ProcessingStatus": "Closed",
        "FundTransferStatus": "Successful",
        "OriginalTotal": {
          "CurrencyCode": "USD",
          "CurrencyAmount": 2500.00
        },
        "ConvertedTotal": {
          "CurrencyCode": "USD",
          "CurrencyAmount": 2500.00
        },
        "FundTransferDate": "2024-01-15T00:00:00Z",
        "TraceId": "1234567890",
        "AccountTail": "0000",
        "BeginningBalance": {
          "CurrencyCode": "USD",
          "CurrencyAmount": 0.00
        },
        "FinancialEventGroupStart": "2024-01-01T00:00:00Z",
        "FinancialEventGroupEnd": "2024-01-14T00:00:00Z"
      }
    ],
    "NextToken": "string"
  }
}
```

**Key Fields:**
- `FinancialEventGroupId`: Settlement ID (use this for transaction lookup)
- `ProcessingStatus`: "Open" or "Closed"
  - **Open**: Settlement is actively accumulating transactions (no `FinancialEventGroupEnd`)
  - **Closed**: Settlement is finalized with a payout date
- `FundTransferDate`: When money hits your bank account
- `FinancialEventGroupStart`: Start date of the settlement period
- `FinancialEventGroupEnd`: End date of the settlement period (NULL for open settlements)

**IMPORTANT - Open Settlements:**
- Open settlements have NULL `FinancialEventGroupEnd`
- Calculate estimated close date: `FinancialEventGroupStart + 15 days`
- Always include open settlements in cash flow projections
- They represent actively accumulating revenue that will be paid soon

#### Get Settlement Transactions

```javascript
GET /finances/v0/financialEventGroups/{eventGroupId}/financialEvents

Required Headers:
  Authorization: Bearer {access_token}
  x-amz-access-token: {access_token}

Query Parameters:
  MaxResultsPerPage: integer (max 100)
  NextToken: string (for pagination)

Response:
{
  "payload": {
    "FinancialEvents": {
      "ShipmentEventList": [...],
      "RefundEventList": [...],
      "ServiceFeeEventList": [...],
      "AdjustmentEventList": [...]
    }
  }
}
```

---

### 2. Reports API (Order Data)

#### Request Report

```javascript
POST /reports/2021-06-30/reports

Required Headers:
  Authorization: Bearer {access_token}
  x-amz-access-token: {access_token}
  Content-Type: application/json

Body:
{
  "reportType": "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL",
  "marketplaceIds": ["ATVPDKIKX0DER"],
  "dataStartTime": "2024-09-28T00:00:00Z",
  "dataEndTime": "2024-10-28T23:59:59Z"
}

Response:
{
  "reportId": "784583020389"
}
```

**CRITICAL - Date Range Limits:**
- `GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL`: **MAX 30 DAYS**
- Requesting more than 30 days returns an error
- Always calculate: `endDate - 30 days` for startDate

#### Check Report Status

```javascript
GET /reports/2021-06-30/reports/{reportId}

Required Headers:
  Authorization: Bearer {access_token}
  x-amz-access-token: {access_token}

Response:
{
  "reportId": "784583020389",
  "reportType": "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL",
  "processingStatus": "IN_QUEUE" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "FATAL",
  "reportDocumentId": "amzn1.spdoc.1.4.na.xxx",
  "createdTime": "2024-10-28T17:45:38Z"
}
```

**Poll Status Every 5 Seconds:**
```javascript
let attempts = 0
const maxAttempts = 60 // 5 minutes max

while (status !== 'DONE' && attempts < maxAttempts) {
  await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
  attempts++
  // Check status...
}
```

#### Download Report

```javascript
// Step 1: Get document details
GET /reports/2021-06-30/documents/{reportDocumentId}

Response:
{
  "reportDocumentId": "amzn1.spdoc.1.4.na.xxx",
  "url": "https://tortuga-prod-na.s3.amazonaws.com/...",
  "compressionAlgorithm": "GZIP"
}

// Step 2: Download from URL (no auth needed)
const response = await fetch(url)

// Step 3: Decompress if GZIP
if (compressionAlgorithm === 'GZIP') {
  const compressedData = new Uint8Array(await response.arrayBuffer())
  const ds = new DecompressionStream('gzip')
  const decompressedStream = new Blob([compressedData]).stream().pipeThrough(ds)
  const decompressedData = await new Response(decompressedStream).arrayBuffer()
  const reportContent = new TextDecoder().decode(decompressedData)
}
```

---

## Rate Limits & Delays

### Standard Rate Limits

| Endpoint | Rate Limit | Burst |
|----------|-----------|-------|
| Settlements List | 0.5 req/sec | 10 |
| Settlement Transactions | 0.5 req/sec | 10 |
| Report Request | 0.0167 req/sec | 15 |
| Report Status | 2 req/sec | 15 |
| Report Download | 0.5 req/sec | 15 |

### Recommended Delays

```javascript
// Between API calls (general)
await new Promise(resolve => setTimeout(resolve, 2000)) // 2 seconds

// Between settlement pages
await new Promise(resolve => setTimeout(resolve, 2000)) // 2 seconds

// Polling report status
await new Promise(resolve => setTimeout(resolve, 5000)) // 5 seconds

// After 403 rate limit error
await new Promise(resolve => setTimeout(resolve, 60000)) // 1 minute
```

### Error Handling

```javascript
async function makeAuthenticatedRequest(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options)
    
    if (response.status === 403) {
      console.log('Got 403, refreshing token...')
      await refreshAccessToken() // Refresh and retry
      continue
    }
    
    if (response.status === 429) {
      console.log('Rate limited, waiting 60 seconds...')
      await new Promise(resolve => setTimeout(resolve, 60000))
      continue
    }
    
    return response
  }
  
  throw new Error('Max retries exceeded')
}
```

---

## Complete Sync Flow

### 1. Settlements Sync (Payouts)

```javascript
// Sync last 1 year of settlements
const startDate = new Date()
startDate.setFullYear(startDate.getFullYear() - 1)
const endDate = new Date()

let nextToken = null
const allSettlements = []

do {
  const params = new URLSearchParams({
    FinancialEventGroupStartedAfter: startDate.toISOString(),
    FinancialEventGroupStartedBefore: endDate.toISOString(),
    MaxResultsPerPage: '100'
  })
  
  if (nextToken) params.append('NextToken', nextToken)
  
  const response = await fetch(
    `${endpoint}/finances/v0/financialEventGroups?${params}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  
  const data = await response.json()
  allSettlements.push(...data.payload.FinancialEventGroupList)
  nextToken = data.payload.NextToken
  
  // Save to database with:
  // - status: 'estimated' if FinancialEventGroupEnd is NULL (open settlement)
  // - status: 'confirmed' if FinancialEventGroupEnd exists (closed settlement)
  // - payout_date: FinancialEventGroupEnd + 15 days (or calculate from start for open)
  
  await new Promise(resolve => setTimeout(resolve, 2000)) // Rate limit delay
} while (nextToken)
```

### 2. Transaction Details Sync (Reports)

```javascript
// Request report for last 30 days (MAX ALLOWED)
const endDate = new Date()
const startDate = new Date(endDate)
startDate.setDate(startDate.getDate() - 30) // Max 30 days

// Step 1: Request report
const reportRequest = await fetch(
  `${endpoint}/reports/2021-06-30/reports`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reportType: 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL',
      marketplaceIds: [marketplaceId],
      dataStartTime: startDate.toISOString(),
      dataEndTime: endDate.toISOString()
    })
  }
)

const { reportId } = await reportRequest.json()

// Step 2: Poll for completion (every 5 seconds)
let status = 'IN_QUEUE'
let reportDocumentId = null
let attempts = 0

while (status !== 'DONE' && attempts < 60) {
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  const statusResponse = await fetch(
    `${endpoint}/reports/2021-06-30/reports/${reportId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  
  const statusData = await statusResponse.json()
  status = statusData.processingStatus
  reportDocumentId = statusData.reportDocumentId
  attempts++
}

// Step 3: Get download URL
const docResponse = await fetch(
  `${endpoint}/reports/2021-06-30/documents/${reportDocumentId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
)

const { url, compressionAlgorithm } = await docResponse.json()

// Step 4: Download and decompress
const downloadResponse = await fetch(url)
const compressedData = new Uint8Array(await downloadResponse.arrayBuffer())
const ds = new DecompressionStream('gzip')
const decompressedStream = new Blob([compressedData]).stream().pipeThrough(ds)
const decompressedData = await new Response(decompressedStream).arrayBuffer()
const reportContent = new TextDecoder().decode(decompressedData)

// Step 5: Parse TSV data
const lines = reportContent.split('\n')
const headers = lines[0].split('\t')

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split('\t')
  // Parse order data...
}
```

---

## Key Data Mappings

### Settlement Status

| Amazon Status | Our Status | Description |
|--------------|------------|-------------|
| `ProcessingStatus: "Open"` with `FinancialEventGroupEnd: null` | `estimated` | Actively accumulating transactions |
| `ProcessingStatus: "Closed"` with `FundTransferDate` | `confirmed` | Payment confirmed and dated |
| Future payout via forecast | `forecasted` | Mathematical prediction |

### Payout Date Calculation

```javascript
function calculatePayoutDate(settlement) {
  // Open settlement (actively accumulating)
  if (!settlement.FinancialEventGroupEnd) {
    const startDate = new Date(settlement.FinancialEventGroupStart)
    const closeDate = new Date(startDate)
    closeDate.setDate(closeDate.getDate() + 15) // Close after 15 days
    return closeDate
  }
  
  // Closed settlement
  if (settlement.FundTransferDate) {
    return new Date(settlement.FundTransferDate)
  }
  
  // Fallback: end date + 1 day
  const endDate = new Date(settlement.FinancialEventGroupEnd)
  endDate.setDate(endDate.getDate() + 1)
  return endDate
}
```

---

## Testing & Debugging

### Test Sequence

1. **Token Refresh**: Verify token doesn't expire mid-sync
2. **Settlements**: Check open and closed settlements are both fetched
3. **Pagination**: Verify NextToken handling for >100 settlements
4. **Reports**: Test GZIP decompression and TSV parsing
5. **Rate Limits**: Ensure proper delays between calls

### Common Issues

| Issue | Solution |
|-------|----------|
| 403 Forbidden | Refresh access token and retry |
| 429 Rate Limit | Wait 60 seconds and retry |
| Empty report data | Check GZIP decompression is working |
| Missing open settlements | Verify filtering logic includes NULL end dates |
| Report date range error | Ensure max 30 days for order reports |

---

## Complete Example: Full Sync

```javascript
async function fullAmazonSync(accountId) {
  // 1. Refresh token if expired
  await refreshTokenIfNeeded(accountId)
  
  // 2. Fetch all settlements (last 12 months)
  const settlements = await fetchAllSettlements(accountId)
  
  // 3. Save settlements to database
  //    - Open settlements: status='estimated'
  //    - Closed settlements: status='confirmed'
  await saveSettlementsToDatabase(settlements)
  
  // 4. Fetch transaction reports (last 30 days max)
  const transactions = await fetchReportTransactions(accountId)
  
  // 5. Save transactions to database
  await saveTransactionsToDatabase(transactions)
  
  // 6. Generate forecasts (if enabled)
  await generatePayoutForecasts(accountId)
  
  return { success: true, settlementsCount: settlements.length }
}
```

---

## References

- [SP-API Developer Guide](https://developer-docs.amazon.com/sp-api/)
- [Finances API Reference](https://developer-docs.amazon.com/sp-api/docs/finances-api-v0-reference)
- [Reports API Reference](https://developer-docs.amazon.com/sp-api/docs/reports-api-v2021-06-30-reference)
- [Authorization Guide](https://developer-docs.amazon.com/sp-api/docs/authorization-guide)
