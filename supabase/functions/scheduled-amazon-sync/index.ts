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
      .select('id, user_id, account_name, marketplace_name, last_sync, sync_status, sync_progress, initial_sync_complete, sync_next_token, created_at')
      .eq('is_active', true)
      .in('sync_status', ['idle', 'syncing']) // Include stuck "syncing" accounts

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

    // Prioritize accounts with continuation tokens (they were interrupted mid-sync)
    amazonAccounts.sort((a, b) => {
      if (a.sync_next_token && !b.sync_next_token) return -1
      if (!a.sync_next_token && b.sync_next_token) return 1
      return 0
    })

    // Sync each account
    const syncResults = []
    for (const account of amazonAccounts) {
      // Check last sync time to avoid over-syncing
      if (account.last_sync) {
        const lastSyncDate = new Date(account.last_sync)
        const now = new Date()
        const minutesSinceSync = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60)
        
        // CRITICAL: Check for stuck syncs FIRST before checking continuation tokens
        // Auto-unstuck: If stuck in "syncing" for >3 minutes, force reset to idle (matches cron interval)
        if (account.sync_status === 'syncing' && minutesSinceSync > 3) {
          console.log(`🔧 AUTO-UNSTUCK: Resetting ${account.account_name} (stuck ${minutesSinceSync.toFixed(1)}m)`)
          await supabase
            .from('amazon_accounts')
            .update({ 
              sync_status: 'idle',
              sync_message: 'Auto-restarting after timeout...',
              sync_next_token: null // Clear potentially expired token
            })
            .eq('id', account.id)
          // Continue to sync this account immediately after unstuck
        }
        // PRIORITY: If account has sync_next_token, it needs to continue (but not too frequently)
        else if (account.sync_next_token) {
          if (minutesSinceSync < 2) { // Wait at least 2 minutes between continuation syncs
            console.log(`⏭️ Continuation ready for ${account.account_name} - but synced ${minutesSinceSync.toFixed(1)}m ago, waiting...`)
            syncResults.push({
              accountId: account.id,
              accountName: account.account_name,
              success: true,
              skipped: true,
              reason: `Continuation pending - last synced ${minutesSinceSync.toFixed(1)} minutes ago`
            })
            continue
          }
          console.log(`🔄 CONTINUING INTERRUPTED SYNC for ${account.account_name} (has nextToken)`)
        }
        // For accounts in backfill mode (progress < 95%), sync conservatively
        else if (!account.initial_sync_complete || (account.sync_progress && account.sync_progress < 95)) {
          const minMinutesBetweenSync = 1 // Reduced to expedite backfill (still respects rate limits)
          
          if (minutesSinceSync < minMinutesBetweenSync) {
            console.log(`Backfill in progress for ${account.account_name} - last synced ${minutesSinceSync.toFixed(1)} minutes ago`)
            syncResults.push({
              accountId: account.id,
              accountName: account.account_name,
              success: true,
              skipped: true,
              reason: `Backfilling - last synced ${minutesSinceSync.toFixed(1)} minutes ago`
            })
            continue
          }
          console.log(`📥 Continuing backfill for ${account.account_name} (${account.sync_progress || 0}% complete)`)
        }
        // For completed accounts, sync every 6 hours (matching cron schedule)
        else {
          const minHoursBetweenSync = 5.5 // Slightly less than 6 hours to avoid timing issues
          
          const hoursSinceSync = minutesSinceSync / 60
          
          if (hoursSinceSync < minHoursBetweenSync) {
            console.log(`Skipping ${account.account_name} - last synced ${hoursSinceSync.toFixed(1)} hours ago`)
            syncResults.push({
              accountId: account.id,
              accountName: account.account_name,
              success: true,
              skipped: true,
              reason: `Last synced ${hoursSinceSync.toFixed(1)} hours ago`
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

        // Add delay between accounts to avoid rate limiting (30 seconds)
        // Reduced from 3 minutes since we're now doing 1-day batches
        await new Promise(resolve => setTimeout(resolve, 30000))
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
