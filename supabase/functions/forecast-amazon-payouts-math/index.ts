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

    // Get user settings including advanced modeling flag
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('forecast_confidence_threshold, default_reserve_lag_days, min_reserve_floor, advanced_modeling_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    const riskAdjustment = userSettings?.forecast_confidence_threshold ?? 8; // Default 8% (Moderate)
    const defaultReserveLag = userSettings?.default_reserve_lag_days ?? 7;
    const minReserveFloor = userSettings?.min_reserve_floor ?? 1000;
    const advancedModelingEnabled = userSettings?.advanced_modeling_enabled ?? false;

    console.log('[MATH-FORECAST] Safety Net Level:', { 
      riskAdjustment, 
      level: riskAdjustment === 3 ? 'Aggressive (-3%)' : riskAdjustment === 8 ? 'Moderate (-8%)' : 'Conservative (-15%)',
      defaultReserveLag, 
      minReserveFloor,
      advancedModelingEnabled
    });

    // Fetch active Amazon accounts that have completed initial sync
    const { data: amazonAccounts } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (!amazonAccounts || amazonAccounts.length === 0) {
      throw new Error('No active Amazon accounts found');
    }

    // Filter accounts that have sufficient data for forecasting
    const accountsReadyForForecast = amazonAccounts.filter(acc => {
      const hasEnoughData = acc.initial_sync_complete && (acc.transaction_count || 0) >= 50;
      if (!hasEnoughData) {
        console.log(`⚠️ Skipping ${acc.account_name}: insufficient data (${acc.transaction_count || 0} transactions, need 50+)`);
      }
      return hasEnoughData;
    });

    if (accountsReadyForForecast.length === 0) {
      console.log('⚠️ No accounts have sufficient data for forecasting yet');
      throw new Error('Amazon accounts do not have enough transaction data yet. Please sync more data before generating forecasts (need 50+ transactions per account).');
    }

    console.log(`✅ ${accountsReadyForForecast.length} of ${amazonAccounts.length} accounts ready for forecasting`);

    // Delete existing forecasted payouts for this account
    await supabase
      .from('amazon_payouts')
      .delete()
      .eq('account_id', accountId)
      .eq('status', 'forecasted');

    const allForecasts: any[] = [];
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    for (const account of accountsReadyForForecast) {
      console.log(`\n[MATH-FORECAST] Processing ${account.account_name} (${account.payout_model} model)`);

      // Fetch historical confirmed payouts to establish realistic caps and recent trends
      const { data: historicalPayouts } = await supabase
        .from('amazon_payouts')
        .select('total_amount, payout_date')
        .eq('amazon_account_id', account.id)
        .eq('status', 'confirmed')
        .order('payout_date', { ascending: false });
      
      let historicalMaxPayout = 0;
      let historicalAvgPayout = 0;
      let recentAvgPayout = 0;
      
      if (historicalPayouts && historicalPayouts.length > 0) {
        historicalMaxPayout = Math.max(...historicalPayouts.map(p => Number(p.total_amount || 0)));
        const totalPayouts = historicalPayouts.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
        historicalAvgPayout = totalPayouts / historicalPayouts.length;
        
        // Calculate recent 90-day average to determine current trend
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const recentPayouts = historicalPayouts.filter(p => {
          const payoutDate = new Date(p.payout_date);
          return payoutDate >= ninetyDaysAgo;
        });
        
        if (recentPayouts.length > 0) {
          const recentTotal = recentPayouts.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
          recentAvgPayout = recentTotal / recentPayouts.length;
          console.log(`📊 Recent 90-day avg: $${recentAvgPayout.toFixed(2)} (${recentPayouts.length} payouts)`);
        }
        
        console.log(`📊 Historical payout stats: Max=$${historicalMaxPayout.toFixed(2)}, Avg=$${historicalAvgPayout.toFixed(2)}, Count=${historicalPayouts.length}`);
      } else {
        console.log('⚠️ No historical confirmed payouts found, using default caps');
      }
      
      // Set realistic cap based on safety net level and historical max
      // Conservative: 85% of historical max, Moderate: 100%, Aggressive: 115%
      let forecastCapMultiplier = 1.0; // Moderate default (100% of historical max)
      if (riskAdjustment === 15) {
        forecastCapMultiplier = 0.85; // Conservative - 85% of historical max
      } else if (riskAdjustment === 3) {
        forecastCapMultiplier = 1.15; // Aggressive - 115% of historical max
      }
      
      const forecastCap = historicalMaxPayout > 0 
        ? historicalMaxPayout * forecastCapMultiplier 
        : 999999; // No cap if no historical data
      
      console.log(`🔒 Forecast cap set to $${forecastCap.toFixed(2)} (${(forecastCapMultiplier * 100).toFixed(0)}% of historical max $${historicalMaxPayout.toFixed(2)})`);

      const reserveLag = account.reserve_lag_days || defaultReserveLag;
      const reserveMultiplier = account.reserve_multiplier || 1.0;
      
      // Check if there's an open settlement for this account
      const { data: openSettlement } = await supabase
        .from('amazon_payouts')
        .select('payout_date')
        .eq('amazon_account_id', account.id)
        .eq('status', 'estimated')
        .order('payout_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Use open settlement's end date if available, otherwise use today
      let forecastStartDate = new Date();
      forecastStartDate.setHours(0, 0, 0, 0);
      
      if (openSettlement?.payout_date) {
        forecastStartDate = new Date(openSettlement.payout_date);
        forecastStartDate.setHours(0, 0, 0, 0);
        console.log(`[MATH-FORECAST] Found open settlement ending ${openSettlement.payout_date}. Forecasts will start 14 days from this date.`);
      } else {
        console.log(`[MATH-FORECAST] No open settlement found. Forecasts will start from today.`);
      }

      // Fetch transactions from last 60 days for accurate trend analysis
      const { data: transactions } = await supabase
        .from('amazon_transactions')
        .select('*')
        .eq('amazon_account_id', account.id)
        .gte('transaction_date', sixtyDaysAgo.toISOString())
        .order('transaction_date', { ascending: true });

      if (!transactions || transactions.length < 30) {
        console.log(`[MATH-FORECAST] Insufficient transaction data (${transactions?.length || 0}/30), skipping forecast`);
        continue;
      }

      console.log(`[MATH-FORECAST] Using ${transactions.length} transactions from last 60 days`);

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
          riskAdjustment,
          forecastStartDate,
          forecastCap,
          recentAvgPayout,
          historicalAvgPayout
        );
        allForecasts.push(...forecasts);
      } else {
        // (B) Daily payout model
        const forecasts = await generateDailyForecasts(
          account,
          userId,
          dailyEligibleMap,
          processedTransactions,
          reserveLag,
          minReserveFloor,
          riskAdjustment,
          advancedModelingEnabled,
          forecastStartDate,
          recentAvgPayout,
          historicalAvgPayout
        );
        allForecasts.push(...forecasts);
      }
    }

    // Upsert all forecasts (update if exists, insert if new)
    if (allForecasts.length > 0) {
      const { error: insertError } = await supabase
        .from('amazon_payouts')
        .upsert(allForecasts, { 
          onConflict: 'amazon_account_id,settlement_id',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error('[MATH-FORECAST] Upsert error:', insertError);
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
  riskAdjustment: number,
  startDate?: Date,
  forecastCap?: number,
  recentAvgPayout?: number,
  historicalAvgPayout?: number
): any[] {
  const forecasts: any[] = [];
  const today = startDate || new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate trend from last 60 days of actual transaction data
  const sortedDates = Array.from(dailyEligibleMap.keys()).sort();
  const recentDates = sortedDates.slice(-60); // Last 60 days
  
  // Split into two periods for trend analysis
  const midPoint = Math.floor(recentDates.length / 2);
  const firstHalf = recentDates.slice(0, midPoint);
  const secondHalf = recentDates.slice(midPoint);
  
  const firstHalfAvg = firstHalf.length > 0
    ? firstHalf.reduce((sum, date) => sum + (dailyEligibleMap.get(date) || 0), 0) / firstHalf.length
    : 0;
  const secondHalfAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, date) => sum + (dailyEligibleMap.get(date) || 0), 0) / secondHalf.length
    : 0;
  
  // Calculate MEDIAN instead of average to avoid outlier influence
  const calculateMedian = (dates: string[]) => {
    const values = dates.map(d => dailyEligibleMap.get(d) || 0).sort((a, b) => a - b);
    if (values.length === 0) return 0;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
  };
  
  const firstHalfMedian = calculateMedian(firstHalf);
  const secondHalfMedian = calculateMedian(secondHalf);
  
  // NEW: Use payout-per-day rate if available, otherwise fall back to traditional average
  // This is more accurate since it accounts for varying settlement period lengths
  const avgDailyEligible = secondHalfMedian || firstHalfMedian || 
    (avgDailyPayoutRate && avgDailyPayoutRate > 0 ? avgDailyPayoutRate : 
      ((recentAvgPayout || historicalAvgPayout || 0) / 14)) || 50;
  
  console.log(`📊 Daily rate baseline: $${avgDailyEligible.toFixed(2)}/day (using ${secondHalfMedian > 0 ? 'recent transaction median' : avgDailyPayoutRate > 0 ? 'payout-per-day rate' : 'traditional average'})`);
  
  // Calculate trend (positive = growing, negative = declining)
  // CRITICAL: Cap trend to realistic bounds to prevent exponential explosion
  let rawTrendMultiplier = firstHalfMedian > 0 ? secondHalfMedian / firstHalfMedian : 1.0;
  
  // More conservative trend caps: -10% to +10% per period max
  const trendMultiplier = Math.max(0.90, Math.min(1.10, rawTrendMultiplier));
  
  console.log(`📊 60-day trend analysis: First half median $${firstHalfMedian.toFixed(2)}, Second half median $${secondHalfMedian.toFixed(2)}, Baseline from recent 90-day avg: $${baselinePayout.toFixed(2)}, Raw trend: ${((rawTrendMultiplier - 1) * 100).toFixed(1)}%, Capped to: ${((trendMultiplier - 1) * 100).toFixed(1)}%`);

  // Generate 6 bi-weekly settlement forecasts (3 months)
  for (let i = 0; i < 6; i++) {
    const settlementDate = new Date(today);
    settlementDate.setDate(settlementDate.getDate() + ((i + 1) * 14));
    const settlementDateStr = settlementDate.toISOString().split('T')[0];

    const prevSettlementDate = new Date(today);
    prevSettlementDate.setDate(prevSettlementDate.getDate() + (i * 14));
    const prevSettlementDateStr = prevSettlementDate.toISOString().split('T')[0];

    // Calculate EligInPeriod = sum of amounts that UNLOCK in this window
    // These are orders with unlock_date (delivery + 7 days) in this period
    let eligibleInPeriod = 0;
    dailyEligibleMap.forEach((amount, date) => {
      if (date > prevSettlementDateStr && date <= settlementDateStr) {
        eligibleInPeriod += amount;
      }
    });

    // For future periods, project forward using trend
    if (eligibleInPeriod === 0) {
      // Apply linear trend growth per period (not exponential to prevent explosion)
      // More conservative: max 50% increase over 6 periods
      const linearTrendMultiplier = 1 + ((trendMultiplier - 1) * (i + 1));
      eligibleInPeriod = avgDailyEligible * 14 * linearTrendMultiplier;
      
      // Additional safety cap: max 1.5x of current avg, min 0.7x
      const basePeriodAmount = avgDailyEligible * 14;
      eligibleInPeriod = Math.max(
        basePeriodAmount * 0.7,
        Math.min(basePeriodAmount * 1.5, eligibleInPeriod)
      );
      
      console.log(`🔮 Period ${i+1}: $${eligibleInPeriod.toFixed(2)} (linear trend: ${((linearTrendMultiplier - 1) * 100).toFixed(1)}%)`);
    }

    // Reserve = funds from orders delivered within reserve lag (7 days before settlement)
    // Per spec: Reserve = Σ ExpectedNet where Unlock > End and OrderDate >= End − L + 1
    let reserveAmount = 0;
    const reserveStartDate = new Date(settlementDate);
    reserveStartDate.setDate(reserveStartDate.getDate() - reserveLag);
    const reserveStartStr = reserveStartDate.toISOString().split('T')[0];

    // Count transactions with delivery dates in the last 7 days before settlement
    transactions.forEach(txn => {
      const deliveryDate = txn.delivery_date || txn.transaction_date;
      if (deliveryDate >= reserveStartStr && deliveryDate <= settlementDateStr) {
        reserveAmount += Math.abs(txn.net_amount || 0);
      }
    });

    // For future periods with no actual data, estimate reserve as % of eligible
    if (reserveAmount === 0 && eligibleInPeriod > 0) {
      // Conservative estimate: 15-20% typically still in reserve
      reserveAmount = eligibleInPeriod * 0.15;
    }

    reserveAmount *= reserveMultiplier;

    // Apply payout formula per spec: (EligInPeriod + BalancePrior + Adjustments - Reserve) × (1 - SafetyMargin)
    // Assume BalancePrior = 0 and Adjustments = 0 for forecasts (can be enhanced later)
    let payoutAmount = Math.max(0, eligibleInPeriod - reserveAmount);

    // Apply safety margin (risk adjustment) - spec suggests 3-15%, default 8%
    const safetyMargin = riskAdjustment / 100; // Convert to decimal
    payoutAmount *= (1 - safetyMargin);

    // Apply historical cap to prevent unrealistic forecasts
    if (forecastCap && payoutAmount > forecastCap) {
      console.log(`⚠️ Capping forecast from $${payoutAmount.toFixed(2)} to $${forecastCap.toFixed(2)} (historical max cap)`);
      payoutAmount = forecastCap;
    }

    // Final check
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
      orders_total: eligibleInPeriod / 0.85, // Reverse calc: eligible is ~85% of gross after fees
      fees_total: (eligibleInPeriod / 0.85) * 0.15, // 15% of gross orders
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

async function generateDailyForecasts(
  account: any,
  userId: string,
  dailyEligibleMap: Map<string, number>,
  transactions: any[],
  reserveLag: number,
  minReserveFloor: number,
  riskAdjustment: number,
  advancedModelingEnabled: boolean,
  startDate?: Date,
  recentAvgPayout?: number,
  historicalAvgPayout?: number
): Promise<any[]> {
  const forecasts: any[] = [];
  const today = startDate || new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate trend from last 60 days
  const sortedDates = Array.from(dailyEligibleMap.keys()).sort();
  const recentDates = sortedDates.slice(-60);
  
  const midPoint = Math.floor(recentDates.length / 2);
  const firstHalf = recentDates.slice(0, midPoint);
  const secondHalf = recentDates.slice(midPoint);
  
  const firstHalfAvg = firstHalf.length > 0
    ? firstHalf.reduce((sum, date) => sum + (dailyEligibleMap.get(date) || 0), 0) / firstHalf.length
    : 0;
  const secondHalfAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, date) => sum + (dailyEligibleMap.get(date) || 0), 0) / secondHalf.length
    : 0;
  
  // Use recent 90-day average as baseline if available, otherwise use historical average
  const baselinePayout = (recentAvgPayout && recentAvgPayout > 0) ? recentAvgPayout : (historicalAvgPayout || 0);
  const trendMultiplier = firstHalfAvg > 0 ? secondHalfAvg / firstHalfAvg : 1.0;
  const avgDailyEligible = secondHalfAvg || firstHalfAvg || (baselinePayout / 14) || 50;

  console.log(`📊 Daily model trend: ${((trendMultiplier - 1) * 100).toFixed(1)}% (${avgDailyEligible.toFixed(2)}/day), Baseline from recent 90-day avg: $${baselinePayout.toFixed(2)}`);

  const settlementDate = new Date(today);
  settlementDate.setDate(settlementDate.getDate() + 14);
  const settlementDateStr = settlementDate.toISOString().split('T')[0];
  
  // Calculate lump sum from actual unlocked transactions in next 14 days
  let totalEligible = 0;
  sortedDates.forEach(date => {
    if (date <= settlementDateStr && date > today.toISOString().split('T')[0]) {
      totalEligible += dailyEligibleMap.get(date) || 0;
    }
  });
  
  // If no actual data for future period, project using trend
  if (totalEligible === 0) {
    totalEligible = avgDailyEligible * 14 * trendMultiplier;
    console.log(`🔮 Using projected eligible: $${totalEligible.toFixed(2)} (trend-adjusted)`);
  }

  // Calculate reserve for settlement period
  let settlementReserve = 0;
  const reserveCutoffDate = new Date(settlementDate);
  reserveCutoffDate.setDate(reserveCutoffDate.getDate() - reserveLag);
  const reserveCutoffStr = reserveCutoffDate.toISOString().split('T')[0];

  transactions.forEach(txn => {
    if (txn.delivery_date > reserveCutoffStr && txn.delivery_date <= settlementDateStr) {
      settlementReserve += txn.net_amount;
    }
  });

  // Calculate lump sum after reserve (use max of calculated reserve or minimum floor)
  const effectiveReserve = Math.max(settlementReserve, minReserveFloor);
  const lumpSumBeforeAdjustment = Math.max(0, totalEligible - effectiveReserve);
  
  // Apply risk adjustment to lump sum
  const adjustmentMultiplier = 1 - (riskAdjustment / 100);
  const adjustedLumpSum = lumpSumBeforeAdjustment * adjustmentMultiplier;
  
  // ADVANCED MODELING: Use daily cumulative distribution with volume weighting
  let dailyDistributions: any[] = [];
  if (advancedModelingEnabled) {
    console.log('🎯 Using ADVANCED cumulative daily distribution with volume weighting');
    
    // Get volume weights for the settlement period
    const volumeWeights: { transaction_date: string; net_amount: number }[] = [];
    transactions.forEach(txn => {
      if (txn.transaction_date > today.toISOString().split('T')[0] && txn.transaction_date <= settlementDateStr) {
        volumeWeights.push({
          transaction_date: txn.transaction_date,
          net_amount: txn.net_amount
        });
      }
    });
    
    // Import the cumulative distribution function
    const { generateCumulativeDailyDistribution } = await import('./daily-cumulative-distribution.ts');
    
    const startDateObj = new Date(today);
    startDateObj.setDate(startDateObj.getDate() + 1);
    
    dailyDistributions = generateCumulativeDailyDistribution(
      startDateObj,
      settlementDate,
      adjustedLumpSum,
      0, // No draws yet for new forecasts
      volumeWeights
    );
    
    console.log(`✅ Generated ${dailyDistributions.length} daily distributions with cumulative unlocking`);
  }
  
  // Fallback: Distribute lump sum evenly across 14 days (simple mode)
  const dailyIncrement = adjustedLumpSum / 14;
  
  let cumulativeAvailable = 0;
  const settlementId = `settlement-${account.id}-${settlementDateStr}`;

  // Generate daily forecasts for current settlement period (next 14 days)
  for (let i = 1; i <= 14; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + i);
    const forecastDateStr = forecastDate.toISOString().split('T')[0];

    let dailyAmount: number;
    let cumulativeForDay: number;
    
    if (advancedModelingEnabled && dailyDistributions.length > 0) {
      // Use advanced cumulative distribution
      const dist = dailyDistributions[i - 1];
      if (dist) {
        dailyAmount = dist.daily_unlock;
        cumulativeForDay = dist.cumulative_available;
      } else {
        dailyAmount = dailyIncrement;
        cumulativeAvailable += dailyIncrement;
        cumulativeForDay = cumulativeAvailable;
      }
    } else {
      // Simple even distribution
      dailyAmount = dailyIncrement;
      cumulativeAvailable += dailyIncrement;
      cumulativeForDay = cumulativeAvailable;
    }
    
    const isSettlementDay = i === 14;

    forecasts.push({
      user_id: userId,
      account_id: account.account_id,
      amazon_account_id: account.id,
      payout_date: forecastDateStr,
      total_amount: dailyAmount, // Daily unlock or daily increment
      reserve_amount: settlementReserve / 14, // Distribute reserve proportionally
      adjustments: 0,
      orders_total: (totalEligible / 14) / 0.85, // Reverse calc from net eligible
      fees_total: ((totalEligible / 14) / 0.85) * 0.15, // 15% of gross
      refunds_total: 0,
      other_total: 0,
      status: 'forecasted',
      payout_type: 'bi-weekly',
      marketplace_name: account.marketplace_name,
      settlement_id: settlementId,
      transaction_count: Math.round(transactions.length / 14),
      currency_code: 'USD',
      modeling_method: advancedModelingEnabled ? 'advanced_cumulative_daily' : 'mathematical_biweekly',
      eligible_in_period: isSettlementDay ? adjustedLumpSum : 0, // Show lump sum only on settlement day
      available_for_daily_transfer: dailyAmount,
      cumulative_available: cumulativeForDay,
      total_daily_draws: 0,
      last_draw_calculation_date: today.toISOString().split('T')[0],
      raw_settlement_data: advancedModelingEnabled && dailyDistributions[i - 1] ? {
        forecast_metadata: {
          method: 'cumulative_daily_distribution',
          daily_unlock_amount: dailyDistributions[i - 1].daily_unlock,
          cumulative_available: dailyDistributions[i - 1].cumulative_available,
          days_accumulated: dailyDistributions[i - 1].days_accumulated,
          volume_weighted: true
        }
      } : undefined
    });
  }

  // Generate additional forecasts for next cycles (15-90 days) with trend applied
  const numberOfAdditionalCycles = Math.floor((90 - 14) / 14);
  
  for (let cycle = 1; cycle <= numberOfAdditionalCycles; cycle++) {
    const cycleStartDay = 14 * cycle + 1;
    const cycleEndDay = 14 * (cycle + 1);
    const cycleSettlementDate = new Date(today);
    cycleSettlementDate.setDate(cycleSettlementDate.getDate() + cycleEndDay);
    const cycleSettlementDateStr = cycleSettlementDate.toISOString().split('T')[0];
    const cycleSettlementId = `settlement-${account.id}-${cycleSettlementDateStr}`;
    
    // Apply trend multiplier for each future cycle (compound growth/decline)
    const cycleTrendMultiplier = Math.pow(trendMultiplier, cycle + 1);
    // Cap at ±20% per cycle
    const cappedMultiplier = Math.max(0.8, Math.min(1.2, cycleTrendMultiplier));
    const futureDaily = dailyIncrement * cappedMultiplier;
    let futureCumulative = 0;
    
    console.log(`🔮 Cycle ${cycle + 1}: trend ${((cappedMultiplier - 1) * 100).toFixed(1)}%, daily $${futureDaily.toFixed(2)}`);
    
    for (let i = cycleStartDay; i <= cycleEndDay; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);
      const forecastDateStr = forecastDate.toISOString().split('T')[0];
      
      futureCumulative += futureDaily;
      const isSettlementDay = i === cycleEndDay;

      forecasts.push({
        user_id: userId,
        account_id: account.account_id,
        amazon_account_id: account.id,
        payout_date: forecastDateStr,
        total_amount: futureDaily,
        reserve_amount: settlementReserve / 14,
        adjustments: 0,
        orders_total: (totalEligible / 14) / 0.85,
        fees_total: ((totalEligible / 14) / 0.85) * 0.15,
        refunds_total: 0,
        other_total: 0,
        status: 'forecasted',
        payout_type: 'bi-weekly',
        marketplace_name: account.marketplace_name,
        settlement_id: cycleSettlementId,
        transaction_count: Math.round(transactions.length / 14),
        currency_code: 'USD',
        modeling_method: 'mathematical_biweekly',
        eligible_in_period: isSettlementDay ? (futureDaily * 14) : 0,
        available_for_daily_transfer: futureDaily,
        total_daily_draws: 0,
        last_draw_calculation_date: today.toISOString().split('T')[0]
      });
    }
  }

  return forecasts;
}

// Function removed - no longer using baseline/duplicate forecasts
// Forecasts are now always generated from actual transaction data