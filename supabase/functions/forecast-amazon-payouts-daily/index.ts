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

    // STEP 1: Calculate weekly sales trend from recent transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentTransactions } = await supabase
      .from('amazon_transactions')
      .select('transaction_date, amount, transaction_type')
      .eq('amazon_account_id', amazonAccountId)
      .gte('transaction_date', thirtyDaysAgo.toISOString())
      .order('transaction_date', { ascending: true });

    let trendMultiplier = 1.0;
    let weeklyTrendPct = 0;
    let week1Avg = 0;
    let week4Avg = 0;

    if (recentTransactions && recentTransactions.length > 10) {
      // Group into 4 weeks
      const weeks: number[][] = [[], [], [], []];
      
      for (const txn of recentTransactions) {
        const txnDate = new Date(txn.transaction_date);
        const daysAgo = Math.floor((new Date().getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));
        const weekIndex = Math.min(3, Math.floor(daysAgo / 7));
        
        // Only count orders and refunds for sales trend
        if (txn.transaction_type === 'Order' || txn.transaction_type === 'Refund') {
          weeks[weekIndex].push(txn.amount || 0);
        }
      }
      
      // Calculate weekly averages
      const weeklyAvgs = weeks.map(week => 
        week.length > 0 ? week.reduce((sum, amt) => sum + amt, 0) / week.length : 0
      );
      
      week1Avg = weeklyAvgs[3] || 0; // Oldest week
      week4Avg = weeklyAvgs[0] || 0; // Most recent week
      
      // Calculate trend percentage
      if (week1Avg > 0) {
        weeklyTrendPct = ((week4Avg - week1Avg) / week1Avg) * 100;
        
        // Apply conservative trend multipliers
        if (weeklyTrendPct > 10) {
          trendMultiplier = 1.08; // Strong growth: +8%
        } else if (weeklyTrendPct > 0) {
          trendMultiplier = 1.03; // Moderate growth: +3%
        } else if (weeklyTrendPct > -10) {
          trendMultiplier = 0.97; // Slight decline: -3%
        } else {
          trendMultiplier = 0.92; // Significant decline: -8%
        }
        
        console.log(`[DAILY FORECAST] Sales Trend: Week 1 avg=$${week1Avg.toFixed(2)}, Week 4 avg=$${week4Avg.toFixed(2)}`);
        console.log(`[DAILY FORECAST] Trend: ${weeklyTrendPct.toFixed(1)}% → multiplier ${trendMultiplier}x`);
      }
    }

    // STEP 2: Calculate TRUE daily average from settlement periods, filtering outliers
    const { data: confirmedPayouts } = await supabase
      .from('amazon_payouts')
      .select('total_amount, payout_date, raw_settlement_data')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'confirmed')
      .gte('payout_date', thirtyDaysAgo.toISOString())
      .order('payout_date', { ascending: true });

    let avgDailyPayout = 0;
    let calculationMethod = '';

    if (confirmedPayouts && confirmedPayouts.length > 0) {
      // Calculate daily rates for each settlement
      const dailyRates: number[] = [];
      
      for (const payout of confirmedPayouts) {
        const settlementData = payout.raw_settlement_data as any;
        const startDate = new Date(settlementData.FinancialEventGroupStart);
        const endDate = new Date(settlementData.FinancialEventGroupEnd);
        const daysInSettlement = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyRate = (payout.total_amount || 0) / daysInSettlement;
        
        dailyRates.push(dailyRate);
      }
      
      // Sort for IQR calculation
      const sortedRates = [...dailyRates].sort((a, b) => a - b);
      const q1Index = Math.floor(sortedRates.length * 0.25);
      const q3Index = Math.floor(sortedRates.length * 0.75);
      const q1 = sortedRates[q1Index];
      const q3 = sortedRates[q3Index];
      const iqr = q3 - q1;
      
      // Define outlier bounds
      const lowerBound = q1 - (1.5 * iqr);
      const upperBound = q3 + (1.5 * iqr);
      
      // Filter outliers
      const filteredRates = dailyRates.filter(rate => rate >= lowerBound && rate <= upperBound);
      const outlierCount = dailyRates.length - filteredRates.length;
      
      // Calculate average from filtered rates
      avgDailyPayout = filteredRates.reduce((sum, rate) => sum + rate, 0) / filteredRates.length;
      calculationMethod = 'settlement_days_iqr_filtered';
      
      console.log(`[DAILY FORECAST] IQR filtering: Q1=$${q1.toFixed(2)}, Q3=$${q3.toFixed(2)}, IQR=$${iqr.toFixed(2)}`);
      console.log(`[DAILY FORECAST] Valid range: $${lowerBound.toFixed(2)} - $${upperBound.toFixed(2)}`);
      console.log(`[DAILY FORECAST] Filtered ${outlierCount} outliers from ${dailyRates.length} settlements`);
      console.log(`[DAILY FORECAST] Final average: $${avgDailyPayout.toFixed(2)}/day from ${filteredRates.length} normal settlements`);
      
    } else {
      // Fallback: Calculate from transactions (for new accounts)
      const { data: transactions } = await supabase
        .from('amazon_transactions')
        .select('net_amount, transaction_date')
        .eq('amazon_account_id', amazonAccountId)
        .gte('transaction_date', thirtyDaysAgo.toISOString());
      
      if (transactions && transactions.length > 0) {
        const totalNet = transactions.reduce((sum, t) => sum + (t.net_amount || 0), 0);
        avgDailyPayout = totalNet / 30;
        calculationMethod = 'transaction_based_estimate';
        console.log(`[DAILY FORECAST] No confirmed payouts, using transaction estimate: $${avgDailyPayout.toFixed(2)}/day`);
      } else {
        throw new Error('No data available for forecast generation');
      }
    }

    // STEP 3: Map safety threshold to multiplier
    let safetyMultiplier = 0.92; // Default to Moderate
    if (riskAdjustment === 3) {
      safetyMultiplier = 0.97; // Aggressive: -3%
    } else if (riskAdjustment === 8) {
      safetyMultiplier = 0.92; // Moderate: -8%
    } else if (riskAdjustment === 15) {
      safetyMultiplier = 0.85; // Conservative: -15%
    }

    console.log(`[DAILY FORECAST] Safety net: ${riskAdjustment}% → multiplier ${safetyMultiplier}`);

    // STEP 4: Get last confirmed payout's SETTLEMENT CLOSE DATE (not payout date)
    const { data: confirmedHistory } = await supabase
      .from('amazon_payouts')
      .select('payout_date, raw_settlement_data')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'confirmed')
      .order('payout_date', { ascending: false })
      .limit(1);

    const { data: openSettlements } = await supabase
      .from('amazon_payouts')
      .select('payout_date, total_amount, raw_settlement_data')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'estimated')
      .order('payout_date', { ascending: false })
      .limit(2);

    let lastConfirmedPayoutDate = new Date();
    let lastCashOutDate = new Date();
    let daysSinceLastCashOut = 0;

    // Get last confirmed payout's settlement close date (when settlement period ended)
    if (confirmedHistory && confirmedHistory.length > 0) {
      const rawData = confirmedHistory[0].raw_settlement_data as any;
      const settlementEndDate = rawData?.FinancialEventGroupEnd;
      
      if (settlementEndDate) {
        // FinancialEventGroupEnd is stored as midnight of the NEXT day in UTC
        // Subtract 1 day to get actual close date
        const closeDate = new Date(settlementEndDate);
        closeDate.setDate(closeDate.getDate() - 1);
        lastConfirmedPayoutDate = closeDate;
        console.log(`[DAILY FORECAST] Settlement closed: ${lastConfirmedPayoutDate.toISOString().split('T')[0]} (payout: ${confirmedHistory[0].payout_date})`);
      } else {
        // Fallback to payout date if no settlement data
        lastConfirmedPayoutDate = new Date(confirmedHistory[0].payout_date);
        console.log(`[DAILY FORECAST] No settlement data, using payout date: ${lastConfirmedPayoutDate.toISOString().split('T')[0]}`);
      }
    } else {
      // No confirmed payouts, use yesterday
      lastConfirmedPayoutDate.setDate(lastConfirmedPayoutDate.getDate() - 1);
      console.log(`[DAILY FORECAST] No confirmed payouts, using yesterday: ${lastConfirmedPayoutDate.toISOString().split('T')[0]}`);
    }

    // Also track last cash-out for cumulative available calculation
    if (openSettlements && openSettlements.length > 0) {
      const latestSettlement = openSettlements[0];
      const settlementData = latestSettlement.raw_settlement_data as any;
      const settlementStartDate = new Date(settlementData?.FinancialEventGroupStart || latestSettlement.payout_date);
      
      // If there's a previous settlement, the cash-out happened between them
      if (openSettlements.length > 1) {
        const previousSettlement = openSettlements[1];
        const prevData = previousSettlement.raw_settlement_data as any;
        lastCashOutDate = new Date(prevData?.FinancialEventGroupEnd || previousSettlement.payout_date);
      } else {
        // Use settlement start as last cash-out reference
        lastCashOutDate = new Date(settlementStartDate);
        lastCashOutDate.setDate(lastCashOutDate.getDate() - 1);
      }
      
      daysSinceLastCashOut = Math.floor((new Date().getTime() - lastCashOutDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`[DAILY FORECAST] Last cash-out detected: ${lastCashOutDate.toISOString().split('T')[0]} (${daysSinceLastCashOut} days ago)`);
    } else {
      lastCashOutDate = new Date(lastConfirmedPayoutDate);
      console.log(`[DAILY FORECAST] No open settlements, using confirmed payout date for cash-out reference`);
    }

    // STEP 5: Delete existing forecasts for this account
    // This ensures only one set of forecasts exists per account
    console.log(`[DAILY FORECAST] Deleting existing forecasts for account: ${accountId}`);
    const { error: deleteError } = await supabase
      .from('amazon_payouts')
      .delete()
      .eq('account_id', accountId)
      .eq('status', 'forecasted');

    if (deleteError) {
      console.error('[DAILY FORECAST] Delete error:', deleteError);
    } else {
      console.log('[DAILY FORECAST] Successfully deleted all existing forecasts for account');
    }

    // STEP 6: Store open settlements (if any) before generating forecasts
    // Open settlements should be visible in amazon_payouts but not counted in forecasts
    if (openSettlements && openSettlements.length > 0) {
      console.log(`[DAILY FORECAST] Found ${openSettlements.length} open settlement(s), these will be visible but not re-forecasted`);
      // Don't insert them again - they already exist with status='estimated'
      // The main forecast function should handle these, but for daily accounts we just acknowledge them
    }

    // STEP 7: Generate 90 unique daily forecasts starting AFTER last confirmed payout
    const forecasts: any[] = [];
    const startDate = new Date(lastConfirmedPayoutDate);
    startDate.setDate(startDate.getDate() + 1); // Start day AFTER last confirmed
    startDate.setHours(0, 0, 0, 0);
    
    console.log(`[DAILY FORECAST] Generating forecasts starting from: ${startDate.toISOString().split('T')[0]}`);
    
    let cumulativeAvailable = 0;

    // Subtle day-of-week patterns
    const dayOfWeekMultipliers: Record<number, number> = {
      0: 0.96, // Sunday
      1: 0.98, // Monday
      2: 1.01, // Tuesday
      3: 1.02, // Wednesday
      4: 1.01, // Thursday
      5: 0.99, // Friday
      6: 0.97  // Saturday
    };

    for (let i = 0; i < 90; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      const forecastDateStr = forecastDate.toISOString().split('T')[0];
      const weekday = forecastDate.getDay();
      
      // Calculate week number for trend decay
      const weekNumber = Math.floor(i / 7);
      const trendDecay = 1.0 - (weekNumber * 0.005); // 0.5% decay per week
      
      // Apply realistic variation (±12%)
      const randomVariation = 0.88 + (Math.random() * 0.24);
      
      // Get day-of-week multiplier
      const dayMultiplier = dayOfWeekMultipliers[weekday] || 1.0;
      
      // Calculate raw forecast with trend adjustment
      const rawForecast = avgDailyPayout * randomVariation * dayMultiplier * trendDecay * trendMultiplier;
      
      // Apply safety net at the END
      const finalForecast = Math.max(0, rawForecast * safetyMultiplier);
      
      // Calculate cumulative available (days since last cash-out)
      const daysFromCashOut = Math.floor((forecastDate.getTime() - lastCashOutDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysFromCashOut >= 0) {
        cumulativeAvailable += finalForecast;
      } else {
        cumulativeAvailable = finalForecast; // Reset for future dates
      }
      
      forecasts.push({
        user_id: userId,
        account_id: accountId,
        amazon_account_id: amazonAccountId,
        settlement_id: `daily_forecast_${forecastDateStr}`,
        payout_date: forecastDateStr,
        total_amount: finalForecast,
        status: 'forecasted',
        payout_type: 'daily',
        modeling_method: 'mathematical_daily',
        eligible_in_period: rawForecast,
        reserve_amount: 0,
        available_for_daily_transfer: finalForecast,
        total_daily_draws: 0,
        raw_settlement_data: {
          forecast_metadata: {
            calculation_method: calculationMethod,
            avg_daily_payout: avgDailyPayout,
            raw_forecast: rawForecast,
            safety_multiplier: safetyMultiplier,
            safety_threshold: riskAdjustment,
            final_forecast: finalForecast,
            random_variation: randomVariation,
            day_multiplier: dayMultiplier,
            trend_decay: trendDecay,
            trend_multiplier: trendMultiplier,
            weekly_trend_pct: weeklyTrendPct,
            week_1_avg: week1Avg,
            week_4_avg: week4Avg,
            week_number: weekNumber,
            days_since_last_cashout: daysFromCashOut >= 0 ? daysFromCashOut : 0,
            cumulative_available: daysFromCashOut >= 0 ? cumulativeAvailable : 0,
            last_cashout_date: lastCashOutDate.toISOString().split('T')[0]
          }
        },
        marketplace_name: amazonAccount.marketplace_name,
        currency_code: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // STEP 7: Insert forecasts
    console.log(`[DAILY FORECAST] Inserting ${forecasts.length} forecasts...`);
    
    const { error: insertError } = await supabase
      .from('amazon_payouts')
      .insert(forecasts);

    if (insertError) {
      console.error('[DAILY FORECAST] Insert error:', JSON.stringify(insertError, null, 2));
      throw new Error(`Failed to insert forecasts: ${insertError.message}`);
    }

    console.log(`[DAILY FORECAST] Successfully generated ${forecasts.length} forecasts`);
    console.log(`[DAILY FORECAST] Base avg: $${avgDailyPayout.toFixed(2)}`);
    console.log(`[DAILY FORECAST] Safety net: ${riskAdjustment}% (${safetyMultiplier}x)`);
    console.log(`[DAILY FORECAST] Sample forecast range: $${Math.min(...forecasts.map(f => f.total_amount)).toFixed(2)} - $${Math.max(...forecasts.map(f => f.total_amount)).toFixed(2)}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        forecastCount: forecasts.length,
        avgDailyPayout: avgDailyPayout.toFixed(2),
        calculationMethod: calculationMethod,
        safetyMultiplier: safetyMultiplier
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
