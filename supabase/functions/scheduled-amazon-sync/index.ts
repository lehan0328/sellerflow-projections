import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting scheduled Amazon sync for all active accounts...')

    // Get all active Amazon accounts with last sync time
    const { data: amazonAccounts, error: fetchError } = await supabase
      .from('amazon_accounts')
      .select('id, user_id, account_name, marketplace_name, last_sync, created_at')
      .eq('is_active', true)

    if (fetchError) {
      console.error('Error fetching Amazon accounts:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Amazon accounts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!amazonAccounts || amazonAccounts.length === 0) {
      console.log('No active Amazon accounts found')
      return new Response(
        JSON.stringify({ message: 'No active accounts to sync' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${amazonAccounts.length} active Amazon accounts to sync`)

    // Sync each account
    const syncResults = []
    for (const account of amazonAccounts) {
      // Determine sync frequency based on account age
      if (account.last_sync) {
        const lastSyncTime = new Date(account.last_sync).getTime()
        const accountCreatedTime = new Date(account.created_at || account.last_sync).getTime()
        const now = Date.now()
        const minutesSinceSync = (now - lastSyncTime) / (1000 * 60)
        const hoursSinceCreation = (now - accountCreatedTime) / (1000 * 60 * 60)
        
        // First 6 hours: sync every 10 minutes
        // After 6 hours: sync every hour
        const isInIntensivePeriod = hoursSinceCreation < 6
        const minMinutesBetweenSync = isInIntensivePeriod ? 10 : 60
        
        if (minutesSinceSync < minMinutesBetweenSync) {
          console.log(`Skipping ${account.account_name} - last synced ${minutesSinceSync.toFixed(1)} minutes ago (threshold: ${minMinutesBetweenSync} minutes)`)
          syncResults.push({
            accountId: account.id,
            accountName: account.account_name,
            success: true,
            skipped: true,
            reason: `Last synced ${minutesSinceSync.toFixed(1)} minutes ago (${isInIntensivePeriod ? 'intensive period' : 'standard period'})`
          })
          continue
        }
      }

      console.log(`Syncing account: ${account.account_name} (${account.id})`)
      
      try {
        // Call the sync-amazon-data function for this account
        const { data, error } = await supabase.functions.invoke('sync-amazon-data', {
          body: { amazonAccountId: account.id }
        })

        if (error) {
          console.error(`Error syncing account ${account.id}:`, error)
          syncResults.push({
            accountId: account.id,
            accountName: account.account_name,
            success: false,
            error: error.message
          })
        } else {
          console.log(`Successfully synced account ${account.id}`)
          syncResults.push({
            accountId: account.id,
            accountName: account.account_name,
            success: true,
            data
          })
        }

        // Add delay between syncs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Exception syncing account ${account.id}:`, error)
        syncResults.push({
          accountId: account.id,
          accountName: account.account_name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = syncResults.filter(r => r.success && !r.skipped).length
    const skipCount = syncResults.filter(r => r.skipped).length
    const failCount = syncResults.filter(r => !r.success).length

    console.log(`Sync complete: ${successCount} succeeded, ${skipCount} skipped, ${failCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${successCount} of ${amazonAccounts.length} accounts`,
        results: syncResults
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in scheduled-amazon-sync function:', error)
    
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
