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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { amazonAccountId, userId } = await req.json();
    
    console.log('[WORKFLOW] Starting forecast workflow for account:', amazonAccountId);

    // =================================================================
    // CHANGE 1: Setup Date Logic (Pure UTC)
    // =================================================================
    const now = new Date();
    
    // Define lookback window (e.g., 3 days) to catch late arrivals
    const lookbackWindow = 3; 
    
    // Calculate "Yesterday" in UTC (needed for fallback logic later)
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Calculate Start of Search Window
    const queryStartDate = new Date(yesterday);
    queryStartDate.setUTCDate(queryStartDate.getUTCDate() - lookbackWindow);

    console.log(`[WORKFLOW] Checking for settlements closed in the last ${lookbackWindow} days (since ${queryStartDate.toISOString().split('T')[0]})`);

    // Fetch recent confirmed settlements
    const { data: recentSettlements, error: settlementsError } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'confirmed')
      .eq('marketplace_name', 'United States')
      .gte('payout_date', queryStartDate.toISOString().split('T')[0])
      .order('payout_date', { ascending: false });

    if (settlementsError) {
      throw settlementsError;
    }

    // =================================================================
    // CHANGE 2: Define Variable & Process Loop
    // =================================================================
    let settlementToProcess = null; // Defined explicitly before loop
    
    if (recentSettlements && recentSettlements.length > 0) {
      for (const settlement of recentSettlements) {
        // Only process if funds transferred successfully
        if (settlement.raw_settlement_data?.FundTransferStatus === 'Succeeded') {
          const settlementEnd = settlement.raw_settlement_data?.FinancialEventGroupEnd;
          
          if (settlementEnd) {
            // Standardize End Date (UTC)
            const endDateUTC = new Date(settlementEnd);
            const endDateStr = endDateUTC.toISOString().split('T')[0];
            
            // Calculate Duration (to exclude 14-day invoices)
            const settlementStart = settlement.raw_settlement_data?.FinancialEventGroupStart;
            let isDailySettlement = true;
            
            if (settlementStart) {
              const startDateUTC = new Date(settlementStart);
              
              // Calculate days difference directly from UTC timestamps
              const diffTime = Math.abs(endDateUTC.getTime() - startDateUTC.getTime());
              const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              isDailySettlement = durationDays <= 3;
              
              console.log(`[WORKFLOW] Settlement ${settlement.id}: closed=${endDateStr} (UTC), duration=${durationDays}d`);
            }
            
            // CHECK RECENCY: Is this date within our lookback window?
            const endDateObj = new Date(endDateStr);
            const isRecent = endDateObj >= queryStartDate;

            if (isRecent && isDailySettlement) {
              settlementToProcess = settlement;
              console.log(`[WORKFLOW] ✅ Found recent settlement to process: ${settlement.id} (Closed: ${endDateStr})`);
              break; // Stop after finding the most recent valid one
            }
          }
        }
      }
    }

    // =================================================================
    // Decision Logic
    // =================================================================
    if (settlementToProcess) {
      // ========== SCENARIO 1: SETTLEMENT DETECTED ==========
      console.log('[WORKFLOW] ========== SCENARIO 1: SETTLEMENT DETECTED ==========');
      
      // Step 1: Track accuracy
      console.log('[WORKFLOW] Step 1: Tracking forecast accuracy...');
      try {
        const { error: accuracyError } = await supabase.functions.invoke('track-forecast-accuracy', {
          body: { actualPayout: settlementToProcess }
        });
        
        if (accuracyError) {
          console.error('[WORKFLOW] Accuracy tracking failed:', accuracyError);
        } else {
          console.log('[WORKFLOW] ✅ Accuracy tracked successfully');
        }
      } catch (err) {
        console.error('[WORKFLOW] Error tracking accuracy:', err);
      }
      
      // Step 2: Regenerate forecasts
      console.log('[WORKFLOW] Step 2: Regenerating forecasts...');
      try {
        const { error: forecastError } = await supabase.functions.invoke('forecast-amazon-payouts', {
          body: { userId }
        });
        
        if (forecastError) {
          console.error('[WORKFLOW] Forecast regeneration failed:', forecastError);
        } else {
          console.log('[WORKFLOW] ✅ Forecasts regenerated successfully');
        }
      } catch (err) {
        console.error('[WORKFLOW] Error regenerating forecasts:', err);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          scenario: 'settlement_detected',
          settlementId: settlementToProcess.settlement_id,
          settlementCloseDate: settlementToProcess.payout_date,
          actions: ['tracked_accuracy', 'regenerated_forecasts']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } else {
      // ========== SCENARIO 2: NO SETTLEMENT ==========
      console.log('[WORKFLOW] ========== SCENARIO 2: NO SETTLEMENT DETECTED ==========');
      
      // Only action: Rollover forecast
      console.log('[WORKFLOW] Rolling over yesterday\'s forecast...');
      try {
        const { data: rolloverResult, error: rolloverError } = await supabase.functions.invoke('rollover-forecast', {
          body: { amazonAccountId, userId }
        });
        
        if (rolloverError) {
          console.error('[WORKFLOW] Rollover failed:', rolloverError);
        } else {
          console.log('[WORKFLOW] ✅ Rollover completed:', rolloverResult);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            scenario: 'no_settlement',
            rolloverResult,
            actions: ['rolled_over_forecast']
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('[WORKFLOW] Error during rollover:', err);
        throw err;
      }
    }

  } catch (error) {
    console.error('[WORKFLOW] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});