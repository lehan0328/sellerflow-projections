import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  id: string;
  delivery_date: string | null;
  gross_amount: number;
  amount: number; // fees (negative)
  shipping_cost: number;
  ads_cost: number;
  return_rate: number;
  chargeback_rate: number;
  transaction_date: string;
}

interface DailyEligible {
  date: string;
  eligible: number;
  transactions: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Invalid or expired token');

    const userId = user.id;
    console.log('[MATH-FORECAST] Starting mathematical forecast for user:', userId);

    // Get user's account_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', userId)
      .single();

    if (!profile?.account_id) throw new Error('User profile not found');
    const accountId = profile.account_id;

    // Get user settings
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('forecast_confidence_threshold, default_reserve_lag_days, min_reserve_floor')
      .eq('user_id', userId)
      .maybeSingle();

    const riskAdjustment = userSettings?.forecast_confidence_threshold ?? 8; // Default 8% (Moderate)
    const defaultReserveLag = userSettings?.default_reserve_lag_days ?? 7;
    const minReserveFloor = userSettings?.min_reserve_floor ?? 1000;

    console.log('[MATH-FORECAST] Safety Net Level:', { 
      riskAdjustment, 
      level: riskAdjustment === 3 ? 'Aggressive (-3%)' : riskAdjustment === 8 ? 'Moderate (-8%)' : 'Conservative (-15%)',
      defaultReserveLag, 
      minReserveFloor 
    });

    // Fetch active Amazon accounts
    const { data: amazonAccounts } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (!amazonAccounts || amazonAccounts.length === 0) {
      throw new Error('No active Amazon accounts found');
    }

    // Delete existing forecasted payouts
    await supabase
      .from('amazon_payouts')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'forecasted');

    const allForecasts: any[] = [];
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    for (const account of amazonAccounts) {
      console.log(`\n[MATH-FORECAST] Processing ${account.account_name} (${account.payout_model} model)`);

      const reserveLag = account.reserve_lag_days || defaultReserveLag;
      const reserveMultiplier = account.reserve_multiplier || 1.0;

      // Fetch transactions from last 3 months
      const { data: transactions } = await supabase
        .from('amazon_transactions')
        .select('*')
        .eq('amazon_account_id', account.id)
        .gte('transaction_date', threeMonthsAgo.toISOString())
        .order('transaction_date', { ascending: true });

      if (!transactions || transactions.length === 0) {
        console.log('[MATH-FORECAST] No transaction data, using baseline estimates');
        const baselineForecasts = generateBaselineForecasts(
          account,
          userId,
          riskAdjustment,
          account.payout_model
        );
        allForecasts.push(...baselineForecasts);
        continue;
      }

      // Calculate Net_i for each order and unlock dates
      const processedTransactions = transactions
        .filter((txn: any) => txn.transaction_type === 'Order' || txn.transaction_type === 'Sale')
        .map((txn: any) => {
          const deliveryDate = txn.delivery_date 
            ? new Date(txn.delivery_date)
            : new Date(txn.transaction_date); // Fallback to transaction date + estimated delivery
          
          deliveryDate.setDate(deliveryDate.getDate() + 3); // Assume 3-day delivery if no delivery_date

          const gross = Number(txn.gross_amount || txn.amount || 0);
          const fees = Math.abs(Number(txn.amount || 0)) * 0.15; // Approx 15% fees if not detailed
          const shipping = Number(txn.shipping_cost || 0);
          const ads = Number(txn.ads_cost || 0);
          const returnRate = Number(txn.return_rate || 0.02); // Default 2%
          const chargebackRate = Number(txn.chargeback_rate || 0.005); // Default 0.5%

          // Net_i = (G_i - F_i - S_i - A_i) × (1 - r_i) × (1 - c_i)
          const netAmount = (gross - fees - shipping - ads) * (1 - returnRate) * (1 - chargebackRate);

          // UnlockDate_i = d_i + L
          const unlockDate = new Date(deliveryDate);
          unlockDate.setDate(unlockDate.getDate() + reserveLag);

          return {
            id: txn.id,
            delivery_date: deliveryDate.toISOString().split('T')[0],
            unlock_date: unlockDate.toISOString().split('T')[0],
            net_amount: netAmount,
            gross,
            fees,
            shipping,
            ads,
            return_rate: returnRate,
            chargeback_rate: chargebackRate
          };
        });

      console.log(`[MATH-FORECAST] Processed ${processedTransactions.length} orders`);

      // Build daily eligible cash series
      const dailyEligibleMap: Map<string, number> = new Map();
      processedTransactions.forEach(txn => {
        const current = dailyEligibleMap.get(txn.unlock_date) || 0;
        dailyEligibleMap.set(txn.unlock_date, current + txn.net_amount);
      });

      // Sort dates
      const sortedDates = Array.from(dailyEligibleMap.keys()).sort();
      
      if (account.payout_model === 'bi-weekly') {
        // (A) 14-day settlement model
        const forecasts = generateBiWeeklyForecasts(
          account,
          userId,
          dailyEligibleMap,
          processedTransactions,
          reserveLag,
          reserveMultiplier,
          minReserveFloor,
          riskAdjustment
        );
        allForecasts.push(...forecasts);
      } else {
        // (B) Daily payout model
        const forecasts = generateDailyForecasts(
          account,
          userId,
          dailyEligibleMap,
          processedTransactions,
          reserveLag,
          minReserveFloor,
          riskAdjustment
        );
        allForecasts.push(...forecasts);
      }
    }

    // Insert all forecasts
    if (allForecasts.length > 0) {
      const { error: insertError } = await supabase
        .from('amazon_payouts')
        .insert(allForecasts);

      if (insertError) {
        console.error('[MATH-FORECAST] Insert error:', insertError);
        throw insertError;
      }
    }

    console.log(`[MATH-FORECAST] Generated ${allForecasts.length} forecasts`);

    return new Response(
      JSON.stringify({ success: true, forecastCount: allForecasts.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[MATH-FORECAST] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateBiWeeklyForecasts(
  account: any,
  userId: string,
  dailyEligibleMap: Map<string, number>,
  transactions: any[],
  reserveLag: number,
  reserveMultiplier: number,
  minReserve: number,
  riskAdjustment: number
): any[] {
  const forecasts: any[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate 6 bi-weekly settlement forecasts (3 months)
  for (let i = 0; i < 6; i++) {
    const settlementDate = new Date(today);
    settlementDate.setDate(settlementDate.getDate() + ((i + 1) * 14));
    const settlementDateStr = settlementDate.toISOString().split('T')[0];

    const prevSettlementDate = new Date(today);
    prevSettlementDate.setDate(prevSettlementDate.getDate() + (i * 14));
    const prevSettlementDateStr = prevSettlementDate.toISOString().split('T')[0];

    // Calculate EligInPeriod(s_k) = sum of daily eligible between settlements
    let eligibleInPeriod = 0;
    dailyEligibleMap.forEach((amount, date) => {
      if (date > prevSettlementDateStr && date <= settlementDateStr) {
        eligibleInPeriod += amount;
      }
    });

    // Calculate Reserve(s_k) ≈ sum of Net_i for deliveries in last L days
    let reserveAmount = 0;
    const reserveCutoffDate = new Date(settlementDate);
    reserveCutoffDate.setDate(reserveCutoffDate.getDate() - reserveLag);
    const reserveCutoffStr = reserveCutoffDate.toISOString().split('T')[0];

    transactions.forEach(txn => {
      if (txn.delivery_date > reserveCutoffStr && txn.delivery_date <= settlementDateStr) {
        reserveAmount += txn.net_amount;
      }
    });

    reserveAmount *= reserveMultiplier;

    // Payout(s_k) ≈ [EligInPeriod + Bal_prior + Adj] - Reserve
    // For simplicity, assume Bal_prior = 0 and Adj = 0 for forecasts
    let payoutAmount = eligibleInPeriod - reserveAmount;

    // Apply risk adjustment
    const adjustmentMultiplier = 1 - (riskAdjustment / 100);
    payoutAmount *= adjustmentMultiplier;

    // Ensure non-negative
    payoutAmount = Math.max(0, payoutAmount);

    forecasts.push({
      user_id: userId,
      account_id: account.account_id,
      amazon_account_id: account.id,
      payout_date: settlementDateStr,
      total_amount: payoutAmount,
      eligible_in_period: eligibleInPeriod,
      reserve_amount: reserveAmount,
      adjustments: 0,
      orders_total: eligibleInPeriod * 1.3,
      fees_total: eligibleInPeriod * 0.15,
      refunds_total: 0,
      other_total: 0,
      status: 'forecasted',
      payout_type: 'bi-weekly',
      marketplace_name: account.marketplace_name,
      settlement_id: `forecast_${account.id}_${i}`,
      transaction_count: 0,
      currency_code: 'USD',
      modeling_method: 'mathematical_biweekly'
    });
  }

  return forecasts;
}

function generateDailyForecasts(
  account: any,
  userId: string,
  dailyEligibleMap: Map<string, number>,
  transactions: any[],
  reserveLag: number,
  minReserveFloor: number,
  riskAdjustment: number
): any[] {
  const forecasts: any[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build cumulative eligible series
  const cumulativeEligible = new Map<string, number>();
  let cumSum = 0;
  
  const sortedDates = Array.from(dailyEligibleMap.keys()).sort();
  sortedDates.forEach(date => {
    cumSum += dailyEligibleMap.get(date) || 0;
    cumulativeEligible.set(date, cumSum);
  });

  // Generate 90 daily forecasts
  for (let i = 1; i <= 90; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + i);
    const forecastDateStr = forecastDate.toISOString().split('T')[0];

    // Avail(t) = sum of eligible up to t
    let availableBalance = cumulativeEligible.get(forecastDateStr) || cumSum;

    // Calculate AccountReserve(t): deliveries in last L days
    let accountReserve = 0;
    const reserveCutoffDate = new Date(forecastDate);
    reserveCutoffDate.setDate(reserveCutoffDate.getDate() - reserveLag);
    const reserveCutoffStr = reserveCutoffDate.toISOString().split('T')[0];

    transactions.forEach(txn => {
      if (txn.delivery_date > reserveCutoffStr && txn.delivery_date <= forecastDateStr) {
        accountReserve += txn.net_amount;
      }
    });

    // DailyPayout(t) = MAX(0, Avail(t) - AccountReserve(t) - MinReserveFloor)
    let dailyPayout = availableBalance - accountReserve - minReserveFloor;

    // Apply risk adjustment
    const adjustmentMultiplier = 1 - (riskAdjustment / 100);
    dailyPayout *= adjustmentMultiplier;

    // Ensure non-negative
    dailyPayout = Math.max(0, dailyPayout);

    forecasts.push({
      user_id: userId,
      account_id: account.account_id,
      amazon_account_id: account.id,
      payout_date: forecastDateStr,
      total_amount: dailyPayout,
      reserve_amount: accountReserve,
      adjustments: 0,
      orders_total: dailyPayout * 1.2,
      fees_total: dailyPayout * 0.15,
      refunds_total: 0,
      other_total: 0,
      status: 'forecasted',
      payout_type: 'daily',
      marketplace_name: account.marketplace_name,
      settlement_id: `forecast_daily_${account.id}_${i}`,
      transaction_count: 0,
      currency_code: 'USD',
      modeling_method: 'mathematical_daily'
    });
  }

  return forecasts;
}

function generateBaselineForecasts(
  account: any,
  userId: string,
  riskAdjustment: number,
  payoutModel: string
): any[] {
  const forecasts: any[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const defaultAmount = payoutModel === 'daily' ? 150 : 2000;
  const maxForecasts = payoutModel === 'daily' ? 90 : 6;
  const incrementDays = payoutModel === 'daily' ? 1 : 14;

  for (let i = 0; i < maxForecasts; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + ((i + 1) * incrementDays));
    
    const adjustmentMultiplier = 1 - (riskAdjustment / 100);
    const adjustedAmount = defaultAmount * adjustmentMultiplier;

    forecasts.push({
      user_id: userId,
      account_id: account.account_id,
      amazon_account_id: account.id,
      payout_date: forecastDate.toISOString().split('T')[0],
      total_amount: Math.max(0, adjustedAmount),
      orders_total: adjustedAmount * 1.3,
      fees_total: adjustedAmount * 0.15,
      refunds_total: 0,
      other_total: 0,
      status: 'forecasted',
      payout_type: payoutModel,
      marketplace_name: account.marketplace_name,
      settlement_id: `forecast_baseline_${account.id}_${i}`,
      transaction_count: 0,
      currency_code: 'USD',
      modeling_method: 'baseline_estimate'
    });
  }

  return forecasts;
}