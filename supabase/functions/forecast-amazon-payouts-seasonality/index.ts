import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Seasonality constants based on Amazon payout behavior
const SEASONALITY = {
  1: 1.12,  // Jan - peak payouts from Q4 sales
  2: 0.92,  // Feb - refund season / slower disbursements
  3: 1.02,  // Mar
  4: 1.00,  // Apr
  5: 1.03,  // May
  6: 1.04,  // Jun
  7: 1.10,  // Jul - Prime Day bump
  8: 0.96,  // Aug
  9: 0.97,  // Sep
  10: 1.05, // Oct
  11: 1.08, // Nov - holiday growth
  12: 1.06, // Dec - strong holiday growth
};

interface PayoutData {
  payout_date: string;
  total_amount: number;
  status: string;
}

Deno.serve(async (req) => {
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

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[Seasonality Forecast] Starting for user ${user.id}`);

    // Get user's account_id and Amazon account info
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    const accountId = profile?.account_id;
    
    // Get the first active Amazon account to detect payout frequency
    const { data: amazonAccount } = await supabase
      .from('amazon_accounts')
      .select('payout_frequency, account_name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();
    
    const payoutFrequency = amazonAccount?.payout_frequency || 'bi-weekly';
    console.log(`[Seasonality Forecast] Detected payout frequency: ${payoutFrequency}`);

    // Fetch all confirmed payouts (historical data)
    const { data: confirmedPayouts, error: payoutError } = await supabase
      .from('amazon_payouts')
      .select('payout_date, total_amount, status, amazon_account_id, marketplace_name')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .order('payout_date', { ascending: false });

    if (payoutError) {
      console.error('[Seasonality Forecast] Error fetching payouts:', payoutError);
      throw payoutError;
    }

    if (!confirmedPayouts || confirmedPayouts.length < 3) {
      throw new Error('Need at least 3 confirmed payouts to generate forecast');
    }

    console.log(`[Seasonality Forecast] Found ${confirmedPayouts.length} confirmed payouts`);

    // Calculate AvgPayout: Average of last 3 full payout cycles
    const last3Payouts = confirmedPayouts.slice(0, 3);
    const avgPayout = last3Payouts.reduce((sum, p) => sum + Number(p.total_amount), 0) / 3;
    console.log(`[Seasonality Forecast] Avg payout (last 3): $${avgPayout.toFixed(2)}`);

    // Calculate Growth Trend: (Avg last 90d) / (Avg prior 90d)
    const now = new Date();
    const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const prior90Days = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const last90Payouts = confirmedPayouts.filter(p => {
      const payoutDate = new Date(p.payout_date);
      return payoutDate >= last90Days;
    });

    const prior90Payouts = confirmedPayouts.filter(p => {
      const payoutDate = new Date(p.payout_date);
      return payoutDate >= prior90Days && payoutDate < last90Days;
    });

    let growthTrend = 1.0;
    if (last90Payouts.length > 0 && prior90Payouts.length > 0) {
      const avgLast90 = last90Payouts.reduce((sum, p) => sum + Number(p.total_amount), 0) / last90Payouts.length;
      const avgPrior90 = prior90Payouts.reduce((sum, p) => sum + Number(p.total_amount), 0) / prior90Payouts.length;
      growthTrend = avgPrior90 > 0 ? avgLast90 / avgPrior90 : 1.0;
    }
    console.log(`[Seasonality Forecast] Growth trend: ${(growthTrend * 100).toFixed(1)}%`);

    // Calculate Momentum Factor: recent acceleration/deceleration
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prior30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const last30Payouts = confirmedPayouts.filter(p => {
      const payoutDate = new Date(p.payout_date);
      return payoutDate >= last30Days;
    });

    const prior30Payouts = confirmedPayouts.filter(p => {
      const payoutDate = new Date(p.payout_date);
      return payoutDate >= prior30Days && payoutDate < last30Days;
    });

    let momentumFactor = 1.0;
    if (last30Payouts.length > 0 && prior30Payouts.length > 0) {
      const avgLast30 = last30Payouts.reduce((sum, p) => sum + Number(p.total_amount), 0) / last30Payouts.length;
      const avgPrior30 = prior30Payouts.reduce((sum, p) => sum + Number(p.total_amount), 0) / prior30Payouts.length;
      momentumFactor = avgPrior30 > 0 ? avgLast30 / avgPrior30 : 1.0;
    }
    console.log(`[Seasonality Forecast] Momentum factor: ${(momentumFactor * 100).toFixed(1)}%`);

    // Get user settings for safety net
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('safety_net_level')
      .eq('user_id', user.id)
      .single();

    const safetyNetLevel = userSettings?.safety_net_level || 'medium';
    
    // Safety net multipliers (conservative adjustments)
    const safetyMultiplier = {
      low: 1.0,      // No adjustment
      medium: 0.95,  // 5% buffer
      high: 0.90,    // 10% buffer
      maximum: 0.85  // 15% buffer
    }[safetyNetLevel] || 0.95;

    console.log(`[Seasonality Forecast] Safety net level: ${safetyNetLevel} (${safetyMultiplier}x)`);

    // Delete existing forecasted payouts
    await supabase
      .from('amazon_payouts')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'forecasted');

    // Get the open settlement with the largest amount to determine forecast start date
    const { data: openSettlements } = await supabase
      .from('amazon_payouts')
      .select('payout_date, total_amount, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'open'])
      .order('total_amount', { ascending: false })
      .limit(1);
    
    let firstForecastDate = new Date();
    firstForecastDate.setDate(firstForecastDate.getDate() + 14); // Default: 14 days from now
    
    if (openSettlements && openSettlements.length > 0) {
      // Start 14 days after the largest open settlement
      const largestOpenDate = new Date(openSettlements[0].payout_date);
      firstForecastDate = new Date(largestOpenDate);
      firstForecastDate.setDate(firstForecastDate.getDate() + 14);
      console.log(`[Seasonality Forecast] Found open settlement: $${openSettlements[0].total_amount} on ${openSettlements[0].payout_date}`);
      console.log(`[Seasonality Forecast] First forecast will be 14 days later: ${firstForecastDate.toISOString().split('T')[0]}`);
    } else {
      console.log(`[Seasonality Forecast] No open settlements found, using 14 days from today`);
    }

    // Generate forecasts - 6 bi-weekly periods
    const forecasts = [];
    
    for (let i = 0; i < 6; i++) {
      const forecastDate = new Date(firstForecastDate);
      forecastDate.setDate(forecastDate.getDate() + (i * 14)); // Each forecast is 14 days apart
      const month = forecastDate.getMonth() + 1; // 1-12
      const seasonality = SEASONALITY[month];

      // Core formula with safety net
      const forecastedAmount = avgPayout * seasonality * growthTrend * momentumFactor * safetyMultiplier;

      forecasts.push({
        user_id: user.id,
        account_id: accountId,
        amazon_account_id: confirmedPayouts[0]?.amazon_account_id,
        settlement_id: `FORECAST-${forecastDate.toISOString().split('T')[0]}`,
        payout_date: forecastDate.toISOString().split('T')[0],
        total_amount: Math.round(forecastedAmount * 100) / 100,
        currency_code: 'USD',
        status: 'forecasted',
        payout_type: payoutFrequency,
        marketplace_name: confirmedPayouts[0]?.marketplace_name || 'Amazon.com',
        modeling_method: payoutFrequency === 'daily' ? 'mathematical_daily' : 'mathematical_biweekly',
        // Store calculation details
        orders_total: avgPayout, // Store baseline for reference
        fees_total: seasonality, // Store seasonality factor
        refunds_total: growthTrend, // Store growth trend
        other_total: momentumFactor, // Store momentum factor
      });

      console.log(`[Seasonality Forecast] Forecast ${i + 1}: ${forecastDate.toISOString().split('T')[0]} (${seasonality}x): $${forecastedAmount.toFixed(2)}`);
    }

    // Insert forecasts
    const { error: insertError } = await supabase
      .from('amazon_payouts')
      .insert(forecasts);

    if (insertError) {
      console.error('[Seasonality Forecast] Error inserting forecasts:', insertError);
      throw insertError;
    }

    console.log(`[Seasonality Forecast] Successfully created ${forecasts.length} forecasts`);

    return new Response(
      JSON.stringify({
        success: true,
        forecastCount: forecasts.length,
        avgPayout: Math.round(avgPayout * 100) / 100,
        growthTrend: Math.round(growthTrend * 1000) / 1000,
        momentumFactor: Math.round(momentumFactor * 1000) / 1000,
        safetyNetLevel,
        safetyMultiplier,
        forecasts: forecasts.map(f => ({
          date: f.payout_date,
          amount: f.total_amount,
          seasonality: f.fees_total,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Seasonality Forecast] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
