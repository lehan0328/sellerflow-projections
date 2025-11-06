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

    if (!amazonAccountId || !userId) {
      throw new Error('amazonAccountId and userId are required');
    }

    console.log('[ROLLOVER] Starting rollover check for account:', amazonAccountId);

    // Get current date in EST (UTC-5)
    const now = new Date();
    const estOffset = -5 * 60; // EST is UTC-5
    const estNow = new Date(now.getTime() + estOffset * 60 * 1000);

    // Get yesterday's date in EST
    const yesterday = new Date(estNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get today's date in EST
    const todayStr = estNow.toISOString().split('T')[0];

    console.log('[ROLLOVER] Checking dates - Yesterday:', yesterdayStr, 'Today:', todayStr);

    // Fetch recent confirmed settlements (last 3 days to account for delays)
    const threeDaysAgo = new Date(yesterday);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);

    const { data: recentSettlements, error: settlementError } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'confirmed')
      .eq('marketplace_name', 'United States')
      .gte('payout_date', threeDaysAgo.toISOString().split('T')[0])
      .order('payout_date', { ascending: false });

    if (settlementError) {
      console.error('[ROLLOVER] Error checking settlement:', settlementError);
      throw settlementError;
    }

    // Check if any settlement CLOSED on yesterday (EST)
    let settlementClosedYesterday = null;

    if (recentSettlements && recentSettlements.length > 0) {
      for (const settlement of recentSettlements) {
        if (settlement.raw_settlement_data?.FundTransferStatus === 'Succeeded') {
          const settlementEnd = settlement.raw_settlement_data?.FinancialEventGroupEnd;
          
          if (settlementEnd) {
            // Convert UTC timestamp to EST date
            const endDateUTC = new Date(settlementEnd);
            const estOffset = -5 * 60; // EST is UTC-5
            const endDateEST = new Date(endDateUTC.getTime() + estOffset * 60 * 1000);
            const endDateStr = endDateEST.toISOString().split('T')[0]; // Now in EST
            
            // Check settlement duration (exclude 14-day invoiced settlements)
            const settlementStart = settlement.raw_settlement_data?.FinancialEventGroupStart;
            let isDailySettlement = true;
            
            if (settlementStart) {
              const startDateUTC = new Date(settlementStart);
              const startDateEST = new Date(startDateUTC.getTime() + estOffset * 60 * 1000);
              const durationDays = Math.ceil((endDateEST.getTime() - startDateEST.getTime()) / (1000 * 60 * 60 * 24));
              isDailySettlement = durationDays <= 3;
              
              console.log(`[ROLLOVER] Settlement ${settlement.id}: closed=${endDateStr} EST, duration=${durationDays}d, payout=${settlement.payout_date}`);
            }
            
            // Found a daily settlement that closed yesterday (EST)
            if (endDateStr === yesterdayStr && isDailySettlement) {
              settlementClosedYesterday = settlement;
              console.log(`[ROLLOVER] ✅ Found settlement closed yesterday (EST): ${settlement.id}`);
              break;
            }
          }
        }
      }
    }

//     if (settlementClosedYesterday) {
//       console.log('[ROLLOVER] Settlement closed yesterday, no rollover needed');
//       return new Response(
//         JSON.stringify({
//           success: true,
//           rolloverOccurred: false,
//           message: 'Settlement found for yesterday, no rollover needed'
//         }),
//         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       );
//     }

//     console.log('[ROLLOVER] No Succeeded settlement found for yesterday, checking forecasts...');

    // Fetch yesterday's forecast
    const { data: yesterdayForecast, error: yesterdayError } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'forecasted')
      .eq('payout_date', yesterdayStr)
      .maybeSingle();

    if (yesterdayError) {
      console.error('[ROLLOVER] Error fetching yesterday forecast:', yesterdayError);
      throw yesterdayError;
    }

    if (!yesterdayForecast) {
      console.log('[ROLLOVER] No forecast found for yesterday, nothing to roll over');
      return new Response(
        JSON.stringify({
          success: true,
          rolloverOccurred: false,
          message: 'No forecast found for yesterday'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch today's forecast
    const { data: todayForecast, error: todayError } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'forecasted')
      .eq('payout_date', todayStr)
      .maybeSingle();

    if (todayError) {
      console.error('[ROLLOVER] Error fetching today forecast:', todayError);
      throw todayError;
    }

    if (!todayForecast) {
      console.log('[ROLLOVER] No forecast found for today, cannot roll over');
      return new Response(
        JSON.stringify({
          success: true,
          rolloverOccurred: false,
          message: 'No forecast found for today to roll into'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ROLLOVER] Rolling over forecast...');
    console.log(`[ROLLOVER] Yesterday forecast: $${yesterdayForecast.total_amount}`);
    console.log(`[ROLLOVER] Today forecast: $${todayForecast.total_amount}`);

    // Calculate new total
    const rolledAmount = yesterdayForecast.total_amount;
    const newTotal = todayForecast.total_amount + rolledAmount;

    console.log(`[ROLLOVER] New total: $${newTotal}`);

    // Update today's forecast with the rolled-over amount
    const { error: updateTodayError } = await supabase
      .from('amazon_payouts')
      .update({
        total_amount: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', todayForecast.id);

    if (updateTodayError) {
      console.error('[ROLLOVER] Error updating today forecast:', updateTodayError);
      throw updateTodayError;
    }

    // Mark yesterday's forecast as rolled_over
    const { error: updateYesterdayError } = await supabase
      .from('amazon_payouts')
      .update({
        status: 'rolled_over',
        updated_at: new Date().toISOString()
      })
      .eq('id', yesterdayForecast.id);

    if (updateYesterdayError) {
      console.error('[ROLLOVER] Error marking yesterday forecast as rolled_over:', updateYesterdayError);
      throw updateYesterdayError;
    }

    console.log('[ROLLOVER] Rollover completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        rolloverOccurred: true,
        rolledAmount: rolledAmount,
        fromDate: yesterdayStr,
        toDate: todayStr,
        newTotal: newTotal,
        message: `Rolled over $${rolledAmount} from ${yesterdayStr} to ${todayStr}. New total: $${newTotal}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ROLLOVER] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
