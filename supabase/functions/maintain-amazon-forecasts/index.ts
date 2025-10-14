import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[MAINTAIN_FORECASTS] Starting forecast maintenance check...');

    // Get all active Amazon accounts
    const { data: amazonAccounts, error: accountsError } = await supabase
      .from('amazon_accounts')
      .select('id, user_id, account_id, account_name, payout_frequency')
      .eq('is_active', true);

    if (accountsError) {
      console.error('[MAINTAIN_FORECASTS] Error fetching accounts:', accountsError);
      throw accountsError;
    }

    console.log(`[MAINTAIN_FORECASTS] Found ${amazonAccounts?.length || 0} active Amazon accounts`);

    let accountsProcessed = 0;
    let forecastsGenerated = 0;

    // Check each account to ensure they have upcoming forecasts
    for (const account of amazonAccounts || []) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Look ahead 60 days
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + 60);

        // Check if account has any forecasted payouts in the next 60 days
        const { data: existingForecasts, error: forecastError } = await supabase
          .from('amazon_payouts')
          .select('id, payout_date')
          .eq('amazon_account_id', account.id)
          .eq('status', 'forecasted')
          .gte('payout_date', today.toISOString().split('T')[0])
          .lte('payout_date', futureDate.toISOString().split('T')[0]);

        if (forecastError) {
          console.error(`[MAINTAIN_FORECASTS] Error checking forecasts for ${account.account_name}:`, forecastError);
          continue;
        }

        const forecastCount = existingForecasts?.length || 0;
        console.log(`[MAINTAIN_FORECASTS] Account ${account.account_name}: ${forecastCount} existing forecasts`);

        // If less than 3 forecasts exist, generate new ones
        if (forecastCount < 3) {
          console.log(`[MAINTAIN_FORECASTS] Generating forecasts for ${account.account_name}...`);
          
          // Call the forecast generation function for this user
          const { error: invokeError } = await supabase.functions.invoke('forecast-amazon-payouts', {
            body: { amazonAccountId: account.id }
          });

          if (invokeError) {
            console.error(`[MAINTAIN_FORECASTS] Error generating forecast for ${account.account_name}:`, invokeError);
          } else {
            forecastsGenerated++;
            console.log(`[MAINTAIN_FORECASTS] Successfully generated forecasts for ${account.account_name}`);
          }
        }

        accountsProcessed++;
      } catch (error) {
        console.error(`[MAINTAIN_FORECASTS] Error processing account ${account.account_name}:`, error);
      }
    }

    console.log(`[MAINTAIN_FORECASTS] Completed: ${accountsProcessed} accounts processed, ${forecastsGenerated} new forecasts generated`);

    return new Response(
      JSON.stringify({
        success: true,
        accountsProcessed,
        forecastsGenerated,
        message: 'Forecast maintenance completed'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[MAINTAIN_FORECASTS] Error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});