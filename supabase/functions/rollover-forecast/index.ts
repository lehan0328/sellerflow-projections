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

    // Check if there's a Succeeded settlement for yesterday (US marketplace only)
    const { data: yesterdaySettlement, error: settlementError } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'confirmed')
      .eq('marketplace_name', 'United States')
      .eq('payout_date', yesterdayStr)
      .maybeSingle();

    if (settlementError) {
      console.error('[ROLLOVER] Error checking settlement:', settlementError);
      throw settlementError;
    }

    // Check if the settlement is actually a Succeeded one and a daily settlement (not invoiced)
    let isSucceededDailySettlement = false;
    if (yesterdaySettlement?.raw_settlement_data?.FundTransferStatus === 'Succeeded') {
      // Check settlement duration - exclude invoiced settlements (14-day periods)
      const settlementStart = yesterdaySettlement.raw_settlement_data?.FinancialEventGroupStart
        ? new Date(yesterdaySettlement.raw_settlement_data.FinancialEventGroupStart)
        : null;
      const settlementEnd = yesterdaySettlement.raw_settlement_data?.FinancialEventGroupEnd
        ? new Date(yesterdaySettlement.raw_settlement_data.FinancialEventGroupEnd)
        : null;

      if (settlementStart && settlementEnd) {
        const settlementDays = Math.ceil((settlementEnd.getTime() - settlementStart.getTime()) / (1000 * 60 * 60 * 24));
        isSucceededDailySettlement = settlementDays <= 3; // Only 1-3 day settlements (daily), not 14-day (invoiced)

        if (settlementDays > 3) {
          console.log(`[ROLLOVER] Found settlement but it's an invoiced/B2B settlement (${settlementDays} days), treating as no settlement`);
        }
      } else {
        // If no settlement duration data, assume it's valid
        isSucceededDailySettlement = true;
      }
    }

    if (yesterdaySettlement && isSucceededDailySettlement) {
      console.log('[ROLLOVER] Succeeded settlement found for yesterday, no rollover needed');
      return new Response(
        JSON.stringify({
          success: true,
          rolloverOccurred: false,
          message: 'Settlement found for yesterday, no rollover needed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ROLLOVER] No Succeeded settlement found for yesterday, checking forecasts...');

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

    // if (!yesterdayForecast) {
    //   console.log('[ROLLOVER] No forecast found for yesterday, nothing to roll over');
    //   return new Response(
    //     JSON.stringify({
    //       success: true,
    //       rolloverOccurred: false,
    //       message: 'No forecast found for yesterday'
    //     }),
    //     { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }

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
