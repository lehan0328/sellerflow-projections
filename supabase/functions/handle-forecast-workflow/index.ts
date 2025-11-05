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

    // Get yesterday in EST
    const now = new Date();
    const estOffset = -5 * 60; // EST is UTC-5
    const estNow = new Date(now.getTime() + estOffset * 60 * 1000);
    const yesterday = new Date(estNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    console.log('[WORKFLOW] Checking for settlements closed on:', yesterdayStr);

    // Query recent confirmed settlements (last 3 days to account for delays)
    const threeDaysAgo = new Date(yesterday);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);
    
    const { data: recentSettlements, error: settlementsError } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'confirmed')
      .eq('marketplace_name', 'United States')
      .gte('payout_date', threeDaysAgo.toISOString().split('T')[0])
      .order('payout_date', { ascending: false });

    if (settlementsError) {
      throw settlementsError;
    }

    // Check if any settlement CLOSED on yesterday
    let settlementClosedYesterday = null;
    
    if (recentSettlements && recentSettlements.length > 0) {
      for (const settlement of recentSettlements) {
        if (settlement.raw_settlement_data?.FundTransferStatus === 'Succeeded') {
          const settlementEnd = settlement.raw_settlement_data?.FinancialEventGroupEnd;
          
          if (settlementEnd) {
            const endDate = new Date(settlementEnd);
            const endDateStr = endDate.toISOString().split('T')[0];
            
            // Check settlement duration (exclude 14-day invoiced settlements)
            const settlementStart = settlement.raw_settlement_data?.FinancialEventGroupStart;
            let isDailySettlement = true;
            
            if (settlementStart) {
              const startDate = new Date(settlementStart);
              const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              isDailySettlement = durationDays <= 3;
              
              console.log(`[WORKFLOW] Settlement ${settlement.id}: closed=${endDateStr}, duration=${durationDays}d, payout=${settlement.payout_date}`);
            }
            
            // Found a daily settlement that closed yesterday
            if (endDateStr === yesterdayStr && isDailySettlement) {
              settlementClosedYesterday = settlement;
              console.log(`[WORKFLOW] ✅ Found settlement closed yesterday: ${settlement.id}`);
              break;
            }
          }
        }
      }
    }

    // DECISION POINT: Which scenario?
    if (settlementClosedYesterday) {
      // ========== SCENARIO 1: SETTLEMENT DETECTED ==========
      console.log('[WORKFLOW] ========== SCENARIO 1: SETTLEMENT DETECTED ==========');
      
      // Step 1: Track accuracy
      console.log('[WORKFLOW] Step 1: Tracking forecast accuracy...');
      try {
        const { error: accuracyError } = await supabase.functions.invoke('track-forecast-accuracy', {
          body: { actualPayout: settlementClosedYesterday }
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
          settlementId: settlementClosedYesterday.settlement_id,
          settlementCloseDate: yesterdayStr,
          payoutAmount: settlementClosedYesterday.total_amount,
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
