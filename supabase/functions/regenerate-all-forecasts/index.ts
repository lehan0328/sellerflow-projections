import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('[DAILY-FORECAST-REGEN] Starting daily forecast regeneration...');

    // Get all users with forecasting enabled
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('user_settings')
      .select('user_id, account_id, forecasts_enabled')
      .eq('forecasts_enabled', true);

    if (settingsError) {
      console.error('Error fetching user settings:', settingsError);
      throw settingsError;
    }

    if (!settings || settings.length === 0) {
      console.log('[DAILY-FORECAST-REGEN] No users with forecasting enabled');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users to process',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DAILY-FORECAST-REGEN] Found ${settings.length} users with forecasting enabled`);

    const results = [];
    
    for (const userSetting of settings) {
      try {
        console.log(`\n[DAILY-FORECAST-REGEN] Processing user ${userSetting.user_id}...`);
        
        // Check if user has Amazon accounts ready for forecasting
        const { data: amazonAccounts } = await supabaseAdmin
          .from('amazon_accounts')
          .select('id, account_name, initial_sync_complete, transaction_count, created_at')
          .eq('user_id', userSetting.user_id)
          .eq('is_active', true);

        if (!amazonAccounts || amazonAccounts.length === 0) {
          console.log(`⚠️ No active Amazon accounts for user ${userSetting.user_id}`);
          results.push({
            user_id: userSetting.user_id,
            success: false,
            reason: 'No active Amazon accounts'
          });
          continue;
        }

        // Verify at least one account meets the 24-hour and 50+ transaction requirements
        const now = new Date();
        const readyAccounts = amazonAccounts.filter(acc => {
          const createdAt = new Date(acc.created_at);
          const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          return acc.initial_sync_complete && 
                 (acc.transaction_count || 0) >= 50 && 
                 hoursSinceCreation >= 24;
        });

        if (readyAccounts.length === 0) {
          console.log(`⚠️ No accounts ready for forecasting for user ${userSetting.user_id}`);
          results.push({
            user_id: userSetting.user_id,
            success: false,
            reason: 'Amazon accounts not ready (need 24 hours + 50 transactions)'
          });
          continue;
        }

        console.log(`✅ ${readyAccounts.length} accounts ready for forecasting`);

        // Delete ALL old forecasts for this account (not just user_id)
        // This ensures only one set of forecasts exists per account
        console.log(`[DAILY-FORECAST-REGEN] Deleting existing forecasts for account: ${userSetting.account_id}`);
        const { error: deleteError } = await supabaseAdmin
          .from('amazon_payouts')
          .delete()
          .eq('account_id', userSetting.account_id)
          .eq('status', 'forecasted');
        
        if (deleteError) {
          console.error(`❌ Error deleting existing forecasts:`, deleteError);
        } else {
          console.log(`✅ Deleted all existing forecasts for account`);
        }

        // Generate new forecasts
        const { data: forecastData, error: forecastError } = await supabaseAdmin.functions.invoke(
          'forecast-amazon-payouts',
          {
            body: { userId: userSetting.user_id }
          }
        );

        if (forecastError) {
          console.error(`❌ Forecast error for user ${userSetting.user_id}:`, forecastError);
          results.push({
            user_id: userSetting.user_id,
            success: false,
            error: forecastError.message
          });
        } else {
          console.log(`✅ Forecasts regenerated for user ${userSetting.user_id}`);
          results.push({
            user_id: userSetting.user_id,
            success: true,
            forecast_count: forecastData?.forecastCount || 0
          });
        }
      } catch (error) {
        console.error(`Error processing user ${userSetting.user_id}:`, error);
        results.push({
          user_id: userSetting.user_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n[DAILY-FORECAST-REGEN] Completed: ${successCount}/${settings.length} users processed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${successCount}/${settings.length} users`,
        total: settings.length,
        successful: successCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[DAILY-FORECAST-REGEN] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});