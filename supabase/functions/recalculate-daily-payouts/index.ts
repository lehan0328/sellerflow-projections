import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    const { amazonAccountId, settlementId, drawAmount } = await req.json();

    console.log('[RECALC] Recalculating daily payouts after draw:', {
      amazonAccountId,
      settlementId,
      drawAmount
    });

    // Get the current settlement bucket
    const { data: currentSettlement, error: settlementError } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('settlement_id', settlementId)
      .eq('amazon_account_id', amazonAccountId)
      .order('payout_date', { ascending: false })
      .limit(1)
      .single();

    if (settlementError || !currentSettlement) {
      throw new Error('Settlement not found');
    }

    // Calculate new totals
    const newTotalDraws = (currentSettlement.total_daily_draws || 0) + drawAmount;
    const remainingLumpSum = Math.max(
      0,
      (currentSettlement.eligible_in_period || 0) - newTotalDraws
    );

    // If draw happened, shift settlement date by 14 days
    const today = new Date();
    const newSettlementDate = new Date(today);
    newSettlementDate.setDate(newSettlementDate.getDate() + 14);
    const newSettlementDateStr = newSettlementDate.toISOString().split('T')[0];

    console.log('[RECALC] New settlement date:', newSettlementDateStr);
    console.log('[RECALC] Remaining lump sum:', remainingLumpSum);

    // Delete all forecasted payouts for this settlement bucket
    await supabase
      .from('amazon_payouts')
      .delete()
      .eq('settlement_id', settlementId)
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'forecasted');

    // Redistribute remaining amount across next 14 days
    const daysUntilSettlement = 14;
    const dailyAmount = remainingLumpSum / daysUntilSettlement;

    const newForecasts: any[] = [];
    let cumulativeAvailable = 0;

    for (let i = 1; i <= daysUntilSettlement; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      cumulativeAvailable += dailyAmount;
      const isSettlementDay = i === daysUntilSettlement;

      newForecasts.push({
        user_id: user.id,
        account_id: currentSettlement.account_id,
        amazon_account_id: amazonAccountId,
        settlement_id: `daily-forecast-${amazonAccountId}-${newSettlementDateStr}`,
        payout_date: forecastDate.toISOString().split('T')[0],
        total_amount: dailyAmount,
        orders_total: currentSettlement.orders_total || 0,
        fees_total: currentSettlement.fees_total || 0,
        refunds_total: 0,
        other_total: 0,
        adjustments: 0,
        status: 'forecasted',
        payout_type: 'bi-weekly',
        marketplace_name: currentSettlement.marketplace_name,
        transaction_count: currentSettlement.transaction_count || 0,
        currency_code: 'USD',
        confidence_score: 0.75,
        modeling_method: 'daily_redistribution_after_draw',
        reserve_amount: currentSettlement.reserve_amount || 0,
        eligible_in_period: isSettlementDay ? remainingLumpSum : 0,
        available_for_daily_transfer: dailyAmount,
        total_daily_draws: newTotalDraws,
        last_draw_calculation_date: today.toISOString().split('T')[0]
      });
    }

    // Insert new forecasts
    const { error: insertError } = await supabase
      .from('amazon_payouts')
      .insert(newForecasts);

    if (insertError) {
      console.error('[RECALC] Error inserting new forecasts:', insertError);
      throw insertError;
    }

    console.log('[RECALC] Successfully recalculated daily payouts');

    return new Response(
      JSON.stringify({
        success: true,
        new_settlement_date: newSettlementDateStr,
        remaining_lump_sum: remainingLumpSum,
        daily_amount: dailyAmount,
        message: 'Daily payouts recalculated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[RECALC] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
