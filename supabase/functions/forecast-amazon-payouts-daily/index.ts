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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { amazonAccountId, userId, accountId } = await req.json();

    console.log(`[DAILY FORECAST] Starting for account: ${amazonAccountId}`);

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
    const adjustmentMultiplier = 1 - (riskAdjustment / 100);

    console.log(`[DAILY FORECAST] Safety net: ${riskAdjustment}% (${(adjustmentMultiplier * 100).toFixed(0)}% of forecast)`);

    // Fetch transactions from last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: transactions, error: txnError } = await supabase
      .from('amazon_transactions')
      .select('*')
      .eq('amazon_account_id', amazonAccountId)
      .gte('transaction_date', ninetyDaysAgo.toISOString())
      .order('transaction_date', { ascending: true });

    if (txnError) {
      throw new Error(`Failed to fetch transactions: ${txnError.message}`);
    }

    console.log(`[DAILY FORECAST] Fetched ${transactions?.length || 0} transactions`);

    if (!transactions || transactions.length === 0) {
      console.log('[DAILY FORECAST] No transactions found, cannot generate forecast');
      return new Response(
        JSON.stringify({ success: false, error: 'No transaction data available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper: Identify real customer orders
    function isRealCustomerOrder(txn: any): boolean {
      const orderIdPattern = /^\d{3}-\d{7}-\d{7}$/;
      const isOrderType = txn.transaction_type === 'Order' || txn.transaction_type === 'Shipment';
      const hasPositiveAmount = (txn.amount || 0) > 0;
      
      const excludeKeywords = ['removal', 'liquidation', 'disposal', 'return-to-seller', 'fba_inventory', 'fba inventory'];
      const isExcluded = excludeKeywords.some(kw => 
        (txn.description?.toLowerCase() || '').includes(kw) ||
        (txn.transaction_type?.toLowerCase() || '').includes(kw)
      );
      
      return isOrderType && 
             orderIdPattern.test(txn.transaction_id) && 
             hasPositiveAmount &&
             !isExcluded;
    }

    // Step 1: Calculate Order Cash Unlock (Delivery Date + 7)
    // CRITICAL: Group by delivery_date FIRST, then calculate unlock dates
    const deliveryDateGroups: Record<string, number> = {};

    // First pass: Group all orders by their delivery date and sum net_amount
    (transactions || [])
      .filter(isRealCustomerOrder)
      .forEach(txn => {
        let deliveryDate = txn.delivery_date;
        
        if (!deliveryDate) {
          // Fallback: use transaction_date if no delivery_date
          deliveryDate = new Date(txn.transaction_date).toISOString().split('T')[0];
        }
        
        const netAmount = txn.net_amount || txn.amount || 0;
        deliveryDateGroups[deliveryDate] = (deliveryDateGroups[deliveryDate] || 0) + netAmount;
      });

    console.log(`[DAILY FORECAST] Grouped ${Object.keys(deliveryDateGroups).length} unique delivery dates`);

    // Second pass: Calculate unlock dates (delivery_date + 7) for each group
    const orderCashUnlock: Record<string, number> = {};

    Object.entries(deliveryDateGroups).forEach(([deliveryDate, totalNetAmount]) => {
      const unlockDate = new Date(deliveryDate);
      unlockDate.setDate(unlockDate.getDate() + 7);
      const unlockDateStr = unlockDate.toISOString().split('T')[0];
      
      orderCashUnlock[unlockDateStr] = totalNetAmount;
      
      console.log(`[DAILY FORECAST] Delivery ${deliveryDate} → Unlock ${unlockDateStr}: $${totalNetAmount.toFixed(2)}`);
    });

    console.log(`[DAILY FORECAST] Calculated order cash unlock for ${Object.keys(orderCashUnlock).length} payout dates`);

    // Log sample delivery date groupings for verification
    console.log(`[DAILY FORECAST] Sample delivery date groupings:`);
    const sampleDeliveryDates = Object.entries(deliveryDateGroups).slice(0, 5);
    sampleDeliveryDates.forEach(([date, amount]) => {
      const unlock = new Date(date);
      unlock.setDate(unlock.getDate() + 7);
      console.log(`  • Delivered ${date}: $${amount.toFixed(2)} → Unlocks ${unlock.toISOString().split('T')[0]}`);
    });

    // Step 2: Calculate Other Cash Flows (Fees, Refunds, Adjustments)
    const otherCashFlows: Record<string, number> = {};

    (transactions || [])
      .filter(txn => !isRealCustomerOrder(txn))
      .forEach(txn => {
        const dateStr = new Date(txn.transaction_date).toISOString().split('T')[0];
        const netAmount = txn.net_amount || txn.amount || 0;
        otherCashFlows[dateStr] = (otherCashFlows[dateStr] || 0) + netAmount;
      });

    // Step 3: Calculate Daily Unlocked Cash
    const dailyUnlocked: Record<string, number> = {};

    const allDates = new Set([
      ...Object.keys(orderCashUnlock),
      ...Object.keys(otherCashFlows)
    ]);

    allDates.forEach(date => {
      dailyUnlocked[date] = 
        (orderCashUnlock[date] || 0) + 
        (otherCashFlows[date] || 0);
    });

    // Step 4: Find Last Cashout Date
    const { data: lastPayout } = await supabase
      .from('amazon_payouts')
      .select('payout_date')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'confirmed')
      .order('payout_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastCashoutDate = lastPayout 
      ? new Date(lastPayout.payout_date)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    console.log(`[DAILY FORECAST] Last cashout date: ${lastCashoutDate.toISOString().split('T')[0]}`);

    // Step 5: Analyze Sales Trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDates = Object.keys(dailyUnlocked)
      .filter(date => new Date(date) >= thirtyDaysAgo)
      .sort();

    // Calculate weekly trend
    const weeklyNetIncome: Record<string, number> = {};
    recentDates.forEach(date => {
      const d = new Date(date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      weeklyNetIncome[weekKey] = (weeklyNetIncome[weekKey] || 0) + (dailyUnlocked[date] || 0);
    });

    const weeks = Object.keys(weeklyNetIncome).sort();
    let growthFactor = 1.0;
    if (weeks.length >= 2) {
      const recentWeekTotal = weeklyNetIncome[weeks[weeks.length - 1]] || 0;
      const priorWeekTotal = weeklyNetIncome[weeks[weeks.length - 2]] || 0;
      if (priorWeekTotal > 0) {
        growthFactor = recentWeekTotal / priorWeekTotal;
      }
      console.log(`[DAILY FORECAST] Growth Factor: ${((growthFactor - 1) * 100).toFixed(1)}%`);
    }

    const last30DaysTotal = recentDates.reduce((sum, date) => sum + (dailyUnlocked[date] || 0), 0);
    const avgDailyUnlock = last30DaysTotal / Math.max(1, recentDates.length);

    console.log(`[DAILY FORECAST] Average daily unlock: $${avgDailyUnlock.toFixed(2)}`);

    // Step 6: Weekday Seasonality Profile
    const weekdayProfile: Record<number, number[]> = {};

    recentDates.forEach(date => {
      const d = new Date(date);
      const weekday = d.getDay();
      if (!weekdayProfile[weekday]) weekdayProfile[weekday] = [];
      weekdayProfile[weekday].push(dailyUnlocked[date] || 0);
    });

    const weekdayAverage: Record<number, number> = {};
    Object.keys(weekdayProfile).forEach(day => {
      const dayNum = parseInt(day);
      const amounts = weekdayProfile[dayNum];
      weekdayAverage[dayNum] = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    });

    // Step 7: Generate Forecasts for 90 Days
    const forecasts: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Delete existing forecasts first
    await supabase
      .from('amazon_payouts')
      .delete()
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'forecasted');

    for (let i = 0; i < 90; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);
      const forecastDateStr = forecastDate.toISOString().split('T')[0];
      
      // Calculate backlog
      let backlog = 0;
      const currentDate = new Date(lastCashoutDate);
      currentDate.setDate(currentDate.getDate() + 1);
      
      while (currentDate < forecastDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        backlog += dailyUnlocked[dateStr] || 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Today's unlock
      let todayUnlock = dailyUnlocked[forecastDateStr] || 0;
      
      // If no actual data (beyond 7 days), use extrapolation
      if (i >= 7 && todayUnlock === 0) {
        const weekday = forecastDate.getDay();
        const baseAmount = weekdayAverage[weekday] || avgDailyUnlock;
        const trendScale = 1.0 + ((growthFactor - 1.0) * (i / 90));
        todayUnlock = baseAmount * trendScale;
      }
      
      const availableAmount = Math.max(0, backlog + todayUnlock);
      const safetyAdjustedAmount = Math.max(0, availableAmount * adjustmentMultiplier);
      
      forecasts.push({
        user_id: userId,
        account_id: accountId,
        amazon_account_id: amazonAccountId,
        settlement_id: `daily_forecast_${forecastDateStr}`,
        payout_date: forecastDateStr,
        total_amount: safetyAdjustedAmount,
        status: 'forecasted',
        payout_type: 'daily',
        modeling_method: 'delivery_date_plus_7',
        eligible_in_period: availableAmount,
        reserve_amount: 0,
        available_for_daily_transfer: safetyAdjustedAmount,
        total_daily_draws: 0,
        raw_settlement_data: {
          forecast_metadata: {
            model_type: 'delivery_date_plus_7',
            last_cashout_date: lastCashoutDate.toISOString().split('T')[0],
            backlog_amount: Math.max(0, backlog),
            daily_unlock_amount: Math.max(0, todayUnlock),
            available_amount: availableAmount,
            safety_adjusted_amount: safetyAdjustedAmount,
            days_since_cashout: Math.ceil((forecastDate.getTime() - lastCashoutDate.getTime()) / (24 * 60 * 60 * 1000)),
            risk_adjustment_pct: riskAdjustment,
            growth_factor: growthFactor,
            avg_daily_unlock: avgDailyUnlock
          }
        },
        marketplace_name: amazonAccount.marketplace_name,
        currency_code: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Batch insert
    console.log(`[DAILY FORECAST] Attempting to insert ${forecasts.length} forecasts...`);
    console.log(`[DAILY FORECAST] Sample forecast:`, JSON.stringify(forecasts[0], null, 2));
    
    const { data: insertData, error: insertError } = await supabase
      .from('amazon_payouts')
      .insert(forecasts);

    if (insertError) {
      console.error('[DAILY FORECAST] Insert error details:', JSON.stringify(insertError, null, 2));
      console.error('[DAILY FORECAST] Insert error code:', insertError.code);
      console.error('[DAILY FORECAST] Insert error message:', insertError.message);
      console.error('[DAILY FORECAST] Insert error hint:', insertError.hint);
      console.error('[DAILY FORECAST] Insert error details:', insertError.details);
      throw new Error(`Failed to insert forecasts: ${insertError.message}`);
    }

    console.log(`[DAILY FORECAST] Successfully inserted ${forecasts.length} forecasts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        forecastCount: forecasts.length,
        lastCashoutDate: lastCashoutDate.toISOString().split('T')[0],
        avgDailyUnlock: avgDailyUnlock.toFixed(2),
        growthFactor: ((growthFactor - 1) * 100).toFixed(1) + '%'
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
