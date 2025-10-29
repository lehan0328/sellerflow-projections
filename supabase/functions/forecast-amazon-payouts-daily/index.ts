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
      
      // FIX: Accumulate amounts instead of overwriting
      orderCashUnlock[unlockDateStr] = (orderCashUnlock[unlockDateStr] || 0) + totalNetAmount;
    });
    
    // Log only first 3 for verification
    const sampleUnlocks = Object.entries(orderCashUnlock).slice(0, 3);
    sampleUnlocks.forEach(([unlockDate, amount]) => {
      console.log(`[DAILY FORECAST] Sample unlock ${unlockDate}: $${amount.toFixed(2)}`);
    });

    console.log(`[DAILY FORECAST] Calculated ${Object.keys(orderCashUnlock).length} unique unlock dates from ${Object.keys(deliveryDateGroups).length} delivery dates`);

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

    // Step 7: Get Open Settlement for Distribution (Days 8-90)
    const { data: openSettlement } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'estimated')
      .order('total_amount', { ascending: false })
      .limit(1)
      .maybeSingle();

    let openSettlementAmount = 0;
    let settlementStartDate = lastCashoutDate;

    if (openSettlement) {
      openSettlementAmount = openSettlement.total_amount || 0;
      const rawData = openSettlement.raw_settlement_data as any;
      const startStr = rawData?.settlement_start_date || rawData?.FinancialEventGroupStart;
      if (startStr) {
        settlementStartDate = new Date(startStr);
      }
      console.log(`[DAILY FORECAST] Using open settlement: $${openSettlementAmount.toFixed(2)} from ${settlementStartDate.toISOString().split('T')[0]}`);
    } else {
      console.log('[DAILY FORECAST] No open settlement found, using historical average');
      // Fallback to historical average if no open settlement
      openSettlementAmount = avgDailyUnlock * 14; // Assume 14-day cycle
    }

    // Calculate daily distribution rate for days 8-90
    const remainingDays = 83; // Days 8-90
    const dailyDistributionRate = openSettlementAmount / remainingDays;

    console.log(`[DAILY FORECAST] Daily distribution rate for days 8-90: $${dailyDistributionRate.toFixed(2)}`);

    // Step 8: Generate Forecasts for 90 Days
    const forecasts: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Delete existing forecasts first
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

    // Check if we have any unlock data
    if (Object.keys(dailyUnlocked).length === 0 && openSettlementAmount === 0) {
      console.log('[DAILY FORECAST] No daily unlock data or open settlement available');
      return new Response(
        JSON.stringify({ success: true, forecastCount: 0, message: 'No data available for forecast' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (let i = 0; i < 90; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);
      const forecastDateStr = forecastDate.toISOString().split('T')[0];
      
      let todayUnlock = 0;
      let modelType = '';
      
      // Days 0-6: Use actual delivery date + 7 data
      if (i < 7) {
        todayUnlock = dailyUnlocked[forecastDateStr] || 0;
        modelType = 'delivery_date_actual';
        console.log(`[DAILY FORECAST] Day ${i}: Using actual data: $${todayUnlock.toFixed(2)}`);
      } 
      // Days 7-89: Use mathematical distribution from open settlement
      else {
        todayUnlock = dailyDistributionRate;
        modelType = 'open_settlement_distribution';
      }
      
      // Calculate backlog (cumulative from last cashout to forecast date)
      let backlog = 0;
      const currentDate = new Date(lastCashoutDate);
      currentDate.setDate(currentDate.getDate() + 1);
      
      while (currentDate < forecastDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        backlog += dailyUnlocked[dateStr] || 0;
        currentDate.setDate(currentDate.getDate() + 1);
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
        modeling_method: 'mathematical_daily',
        eligible_in_period: availableAmount,
        reserve_amount: 0,
        available_for_daily_transfer: safetyAdjustedAmount,
        total_daily_draws: 0,
        raw_settlement_data: {
          forecast_metadata: {
            model_type: modelType,
            last_cashout_date: lastCashoutDate.toISOString().split('T')[0],
            backlog_amount: Math.max(0, backlog),
            daily_unlock_amount: Math.max(0, todayUnlock),
            available_amount: availableAmount,
            safety_adjusted_amount: safetyAdjustedAmount,
            days_since_cashout: Math.ceil((forecastDate.getTime() - lastCashoutDate.getTime()) / (24 * 60 * 60 * 1000)),
            risk_adjustment_pct: riskAdjustment,
            open_settlement_amount: openSettlementAmount,
            daily_distribution_rate: dailyDistributionRate,
            settlement_start_date: settlementStartDate.toISOString().split('T')[0]
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
