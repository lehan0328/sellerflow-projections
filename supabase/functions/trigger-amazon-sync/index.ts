import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { amazonAccountId, userId } = await req.json()

    if (!amazonAccountId || !userId) {
      throw new Error('amazonAccountId and userId are required')
    }

    console.log('Triggering sync for account:', amazonAccountId)

    // Call the sync-amazon-data function with service role authorization
    const syncUrl = `${supabaseUrl}/functions/v1/sync-amazon-data`
    const syncResponse = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        amazonAccountId,
        userId,
        cronJob: true
      })
    })

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text()
      console.error('Sync trigger error:', syncResponse.status, errorText)
      throw new Error(`Sync failed: ${syncResponse.status} ${errorText}`)
    }

    const data = await syncResponse.json()
    console.log('Sync triggered successfully:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sync triggered successfully',
        data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
