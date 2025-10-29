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

    // STEP 1: Get last 30 days of CONFIRMED payouts to calculate true average
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: confirmedPayouts } = await supabase
      .from('amazon_payouts')
      .select('total_amount, payout_date')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'confirmed')
      .gte('payout_date', thirtyDaysAgo.toISOString())
      .order('payout_date', { ascending: true });

    let avgDailyPayout = 0;
    let calculationMethod = '';

    if (confirmedPayouts && confirmedPayouts.length > 0) {
      // Calculate average from confirmed payouts
      const totalConfirmed = confirmedPayouts.reduce((sum, p) => sum + (p.total_amount || 0), 0);
      avgDailyPayout = totalConfirmed / confirmedPayouts.length;
      calculationMethod = 'confirmed_payouts_average';
      console.log(`[DAILY FORECAST] Using confirmed payouts: ${confirmedPayouts.length} payouts, avg = $${avgDailyPayout.toFixed(2)}`);
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

    // STEP 2: Map safety threshold to multiplier
    let safetyMultiplier = 0.92; // Default to Moderate
    if (riskAdjustment === 3) {
      safetyMultiplier = 0.97; // Aggressive: -3%
    } else if (riskAdjustment === 8) {
      safetyMultiplier = 0.92; // Moderate: -8%
    } else if (riskAdjustment === 15) {
      safetyMultiplier = 0.85; // Conservative: -15%
    }

    console.log(`[DAILY FORECAST] Safety net: ${riskAdjustment}% → multiplier ${safetyMultiplier}`);

    // STEP 3: Delete existing forecasts
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

    // STEP 4: Generate 90 unique daily forecasts
    const forecasts: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
      const forecastDate = new Date(today);
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
      
      // Calculate raw forecast
      const rawForecast = avgDailyPayout * randomVariation * dayMultiplier * trendDecay;
      
      // Apply safety net at the END
      const finalForecast = Math.max(0, rawForecast * safetyMultiplier);
      
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
            week_number: weekNumber
          }
        },
        marketplace_name: amazonAccount.marketplace_name,
        currency_code: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // STEP 5: Insert forecasts
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
