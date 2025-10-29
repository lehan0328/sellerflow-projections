import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Daily forecast using backlog-based distribution method
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

    const { amazonAccountId, userId, accountId } = await req.json();

    console.log(`[DAILY FORECAST] Starting backlog-based forecast for account: ${amazonAccountId}`);

    // Get Amazon account details
    const { data: amazonAccount, error: accountError } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('id', amazonAccountId)
      .single();

    if (accountError || !amazonAccount) {
      throw new Error(`Failed to fetch Amazon account: ${accountError?.message}`);
    }

    // Verify this is a daily settlement account
    if (amazonAccount.payout_model !== 'daily' && amazonAccount.payout_frequency !== 'daily') {
      console.log('[DAILY FORECAST] Not a daily account, skipping');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Not a daily settlement account' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's safety net preference
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('forecast_confidence_threshold')
      .eq('user_id', userId)
      .maybeSingle();

    const riskAdjustment = userSettings?.forecast_confidence_threshold ?? 5;
    const safetyMultiplier = 1 - (riskAdjustment / 100);

    console.log(`[DAILY FORECAST] Safety net: ${riskAdjustment}% (applying ${(safetyMultiplier * 100).toFixed(0)}%)`);

    // STEP 1: Get Current Open Settlement Data
    const { data: openSettlement } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'estimated')
      .order('total_amount', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!openSettlement) {
      console.log('[DAILY FORECAST] No open settlement found');
      return new Response(
        JSON.stringify({ success: false, error: 'No open settlement data available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openSettlementAmount = openSettlement.total_amount || 0;
    const rawData = openSettlement.raw_settlement_data as any;
    const settlementStartStr = rawData?.settlement_start_date || rawData?.FinancialEventGroupStart;
    const settlementStartDate = settlementStartStr ? new Date(settlementStartStr) : new Date();

    console.log(`[DAILY FORECAST] Open settlement: $${openSettlementAmount.toFixed(2)} from ${settlementStartDate.toISOString().split('T')[0]}`);

    // STEP 2: Fetch Last 30 Days of Transaction Data for Net Income Trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: transactions, error: txnError } = await supabase
      .from('amazon_transactions')
      .select('*')
      .eq('amazon_account_id', amazonAccountId)
      .gte('transaction_date', thirtyDaysAgo.toISOString())
      .order('transaction_date', { ascending: true });

    if (txnError) {
      throw new Error(`Failed to fetch transactions: ${txnError.message}`);
    }

    console.log(`[DAILY FORECAST] Fetched ${transactions?.length || 0} transactions from last 30 days`);

    // STEP 3: Calculate Daily Net Income (Orders - Fees)
    const dailyNetIncome: Record<string, number> = {};

    (transactions || []).forEach(txn => {
      const dateStr = new Date(txn.transaction_date).toISOString().split('T')[0];
      const netAmount = txn.net_amount || txn.amount || 0;
      dailyNetIncome[dateStr] = (dailyNetIncome[dateStr] || 0) + netAmount;
    });

    // Calculate rolling 7-day average net income
    const sortedDates = Object.keys(dailyNetIncome).sort();
    const last7Days = sortedDates.slice(-7);
    const last7DaysTotal = last7Days.reduce((sum, date) => sum + (dailyNetIncome[date] || 0), 0);
    const avgDailyNetIncome = last7DaysTotal / Math.max(1, last7Days.length);

    console.log(`[DAILY FORECAST] Average daily net income (last 7 days): $${avgDailyNetIncome.toFixed(2)}`);

    // STEP 4: Calculate Weekday Seasonality
    const weekdayTotals: Record<number, number[]> = {};

    sortedDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const weekday = date.getDay();
      if (!weekdayTotals[weekday]) weekdayTotals[weekday] = [];
      weekdayTotals[weekday].push(dailyNetIncome[dateStr] || 0);
    });

    const weekdaySeasonality: Record<number, number> = {};
    Object.keys(weekdayTotals).forEach(day => {
      const dayNum = parseInt(day);
      const amounts = weekdayTotals[dayNum];
      const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      weekdaySeasonality[dayNum] = avg / avgDailyNetIncome; // Ratio compared to average
    });

    // STEP 5: Find Last Payout Date
    const { data: lastPayout } = await supabase
      .from('amazon_payouts')
      .select('payout_date')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'confirmed')
      .order('payout_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastPayoutDate = lastPayout 
      ? new Date(lastPayout.payout_date)
      : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    console.log(`[DAILY FORECAST] Last payout date: ${lastPayoutDate.toISOString().split('T')[0]}`);

    // STEP 6: Delete Existing Forecasts
    const { error: deleteError } = await supabase
      .from('amazon_payouts')
      .delete()
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'forecasted');

    if (deleteError) {
      console.error('[DAILY FORECAST] Delete error:', deleteError);
    } else {
      console.log('[DAILY FORECAST] Deleted existing forecasts');
    }

    // STEP 7: Generate 90-Day Forecast with Improved Algorithm
    const forecasts: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`[DAILY FORECAST] Base daily average: $${avgDailyNetIncome.toFixed(2)}`);

    // Define day-of-week variation (more realistic patterns)
    const dayOfWeekMultipliers: Record<number, number> = {
      0: 0.85, // Sunday
      1: 0.95, // Monday
      2: 1.0,  // Tuesday
      3: 1.05, // Wednesday
      4: 1.1,  // Thursday
      5: 1.0,  // Friday
      6: 0.9   // Saturday
    };

    // Distribute open settlement over 3-4 days instead of 7 to reduce repetition
    const settlementDistributionDays = 4;
    const baseSettlementDaily = openSettlementAmount / settlementDistributionDays;

    for (let i = 0; i < 90; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);
      const forecastDateStr = forecastDate.toISOString().split('T')[0];
      const weekday = forecastDate.getDay();
      
      let forecastAmount = 0;
      let modelType = '';
      
      // Get day-of-week multiplier
      const dayMultiplier = dayOfWeekMultipliers[weekday] || 1.0;
      
      // Add randomness to avoid repeating numbers (±5%)
      const randomVariation = 0.95 + (Math.random() * 0.1);
      
      if (i < settlementDistributionDays) {
        // Days 0-3: Distribute open settlement with variation
        forecastAmount = baseSettlementDaily * dayMultiplier * randomVariation;
        modelType = 'open_settlement_distribution';
      } else if (i < 7) {
        // Days 4-6: Blend settlement and daily average
        const blendFactor = (i - settlementDistributionDays) / (7 - settlementDistributionDays);
        const settlementPart = baseSettlementDaily * (1 - blendFactor);
        const dailyPart = avgDailyNetIncome * blendFactor;
        forecastAmount = (settlementPart + dailyPart) * dayMultiplier * randomVariation;
        modelType = 'blended_transition';
      } else if (i < 14) {
        // Days 7-13: Use daily average with day-of-week variation
        forecastAmount = avgDailyNetIncome * dayMultiplier * randomVariation;
        modelType = 'daily_average_with_variation';
      } else {
        // Days 14+: Conservative estimate (85% of average)
        const conservativeFactor = 0.85;
        forecastAmount = avgDailyNetIncome * dayMultiplier * conservativeFactor * randomVariation;
        modelType = 'conservative_projection';
      }
      
      // Apply safety net adjustment
      const safetyAdjustedAmount = Math.max(0, forecastAmount * safetyMultiplier);
      
      forecasts.push({
        user_id: userId,
        account_id: accountId,
        amazon_account_id: amazonAccountId,
        settlement_id: `daily_forecast_${forecastDateStr}`,
        payout_date: forecastDateStr,
        total_amount: safetyAdjustedAmount,
        status: 'forecasted',
        payout_type: 'daily',
        modeling_method: 'mathematical_daily',
        eligible_in_period: forecastAmount,
        reserve_amount: 0,
        available_for_daily_transfer: safetyAdjustedAmount,
        total_daily_draws: 0,
        raw_settlement_data: {
          forecast_metadata: {
            model_type: modelType,
            open_settlement_amount: openSettlementAmount,
            settlement_start_date: settlementStartDate.toISOString().split('T')[0],
            avg_daily_net_income: avgDailyNetIncome,
            seasonality_factor: seasonalityFactor,
            safety_adjustment: safetyMultiplier,
            forecast_amount: forecastAmount,
            safety_adjusted_amount: safetyAdjustedAmount,
            cumulative_balance: i < 14 ? cumulativeBalance : null,
            daily_income_projected: dailyIncome,
            last_payout_date: lastPayoutDate.toISOString().split('T')[0]
          }
        },
        marketplace_name: amazonAccount.marketplace_name,
        currency_code: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // STEP 8: Insert Forecasts
    console.log(`[DAILY FORECAST] Inserting ${forecasts.length} forecasts...`);
    
    const { error: insertError } = await supabase
      .from('amazon_payouts')
      .insert(forecasts);

    if (insertError) {
      console.error('[DAILY FORECAST] Insert error:', JSON.stringify(insertError, null, 2));
      throw new Error(`Failed to insert forecasts: ${insertError.message}`);
    }

    console.log(`[DAILY FORECAST] Successfully inserted ${forecasts.length} forecasts`);
    console.log(`[DAILY FORECAST] Days 0-6 avg: $${firstWeekDailyRate.toFixed(2)}`);
    console.log(`[DAILY FORECAST] Days 7-13: Backlog delta method`);
    console.log(`[DAILY FORECAST] Days 14+: 80% of $${avgDailyNetIncome.toFixed(2)} = $${(avgDailyNetIncome * 0.8).toFixed(2)}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        forecastCount: forecasts.length,
        openSettlementAmount: openSettlementAmount.toFixed(2),
        avgDailyNetIncome: avgDailyNetIncome.toFixed(2),
        firstWeekDailyRate: firstWeekDailyRate.toFixed(2)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[DAILY FORECAST] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
