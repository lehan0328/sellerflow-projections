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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Starting scheduled Amazon sync for all active accounts...')

    // Get all active Amazon accounts that need syncing
    const { data: amazonAccounts, error: fetchError } = await supabase
      .from('amazon_accounts')
      .select('id, user_id, account_name, marketplace_name, last_sync, sync_status, created_at')
      .eq('is_active', true)
      .or('sync_status.eq.idle,sync_status.eq.syncing') // Include stuck "syncing" accounts

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
      // Check last sync time to avoid over-syncing
      if (account.last_sync) {
        const lastSyncDate = new Date(account.last_sync)
        const now = new Date()
        const minutesSinceSync = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60)
        
        // If stuck in "syncing" status for >2 minutes, reset it
        if (account.sync_status === 'syncing' && minutesSinceSync > 2) {
          console.log(`Resetting stuck sync for ${account.account_name}`)
          await supabase
            .from('amazon_accounts')
            .update({ sync_status: 'idle' })
            .eq('id', account.id)
        }
        // Otherwise, sync every 5 minutes (matching cron schedule)
        else {
          const minMinutesBetweenSync = 4.5 // Slightly less than 5 to avoid timing issues
          
          if (minutesSinceSync < minMinutesBetweenSync) {
            console.log(`Skipping ${account.account_name} - last synced ${minutesSinceSync.toFixed(1)} minutes ago`)
            syncResults.push({
              accountId: account.id,
              accountName: account.account_name,
              success: true,
              skipped: true,
              reason: `Last synced ${minutesSinceSync.toFixed(1)} minutes ago`
            })
            continue
          }
        }
      }

      console.log(`Syncing account: ${account.account_name} (${account.id})`)
      
      try {
        // Directly call sync with service role (bypassing auth check for cron jobs)
        // The sync function will use the service role key to access the database
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-amazon-data`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              amazonAccountId: account.id,
              userId: account.user_id,
              cronJob: true  // Flag to bypass user auth check
            })
          }
        )

        const data = await response.json()

        if (!response.ok) {
          console.error(`Error syncing account ${account.id}:`, data)
          syncResults.push({
            accountId: account.id,
            accountName: account.account_name,
            success: false,
            error: data.error || 'Sync failed'
          })
        } else {
          console.log(`Successfully started sync for account ${account.id}`)
          syncResults.push({
            accountId: account.id,
            accountName: account.account_name,
            success: true,
            data
          })
        }

        // Add delay between accounts to avoid rate limiting (3 minutes = 180 seconds)
        // This ensures we respect Amazon's 2-minute rate limit per account
        await new Promise(resolve => setTimeout(resolve, 180000))
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
    const skippedCount = syncResults.filter(r => r.skipped).length
    const failedCount = syncResults.filter(r => !r.success).length

    console.log(`Sync complete: ${successCount} succeeded, ${skippedCount} skipped, ${failedCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sync complete: ${successCount} succeeded, ${skippedCount} skipped, ${failedCount} failed`,
        results: syncResults
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in scheduled Amazon sync:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
