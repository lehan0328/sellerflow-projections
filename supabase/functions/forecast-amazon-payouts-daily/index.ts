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
      throw new Error('This function is only for daily settlement accounts');
    }

    // Get user's safety net preference
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('forecast_confidence_threshold')
      .eq('user_id', userId)
      .maybeSingle();

    const riskAdjustment = userSettings?.forecast_confidence_threshold ?? 5; // Default: -5%
    const adjustmentMultiplier = 1 - (riskAdjustment / 100);

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

    // Helper: Identify real customer orders
    function isRealCustomerOrder(txn: any): boolean {
      const orderIdPattern = /^\d{3}-\d{7}-\d{7}$/;
      const isOrderType = txn.transaction_type === 'Order' || txn.transaction_type === 'Shipment';
      const hasPositiveAmount = (txn.amount || 0) > 0;
      
      // Exclude FBA removals, liquidations, disposals
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
    const orderCashUnlock: Record<string, number> = {};

    (transactions || [])
      .filter(isRealCustomerOrder)
      .forEach(txn => {
        let deliveryDate = txn.delivery_date;
        
        if (!deliveryDate) {
          // Fallback: use transaction_date + 7 if no delivery_date
          const fallbackDate = new Date(txn.transaction_date);
          fallbackDate.setDate(fallbackDate.getDate() + 7);
          deliveryDate = fallbackDate.toISOString().split('T')[0];
        }
        
        const unlockDate = new Date(deliveryDate);
        unlockDate.setDate(unlockDate.getDate() + 7);
        const unlockDateStr = unlockDate.toISOString().split('T')[0];
        
        const amount = txn.amount || 0;
        orderCashUnlock[unlockDateStr] = (orderCashUnlock[unlockDateStr] || 0) + amount;
      });

    console.log(`[DAILY FORECAST] Calculated order cash unlock for ${Object.keys(orderCashUnlock).length} dates`);

    // Step 2: Calculate Other Cash Flows (Fees, Refunds, Adjustments)
    const otherCashFlows: Record<string, number> = {};

    (transactions || [])
      .filter(txn => !isRealCustomerOrder(txn))
      .forEach(txn => {
        const dateStr = new Date(txn.transaction_date).toISOString().split('T')[0];
        const amount = txn.amount || 0;
        
        // Fees, refunds, chargebacks are typically negative
        // Reimbursements, SAFE-T, adjustments can be positive or negative
        otherCashFlows[dateStr] = (otherCashFlows[dateStr] || 0) + amount;
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
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago

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
      weekStart.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
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

    // Calculate daily average
    const last30DaysTotal = recentDates.reduce((sum, date) => sum + (dailyUnlocked[date] || 0), 0);
    const avgDailyUnlock = last30DaysTotal / Math.max(1, recentDates.length);

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

    for (let i = 0; i < 90; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);
      const forecastDateStr = forecastDate.toISOString().split('T')[0];
      
      // Calculate backlog: sum of all daily_unlocked from day after last cashout to day before forecast
      let backlog = 0;
      const currentDate = new Date(lastCashoutDate);
      currentDate.setDate(currentDate.getDate() + 1); // Start day after last cashout
      
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
        
        // Apply growth trend (smooth over 90 days)
        const trendScale = 1.0 + ((growthFactor - 1.0) * (i / 90));
        todayUnlock = baseAmount * trendScale;
      }
      
      // Available for withdrawal = backlog + today's unlock
      const availableAmount = Math.max(0, backlog + todayUnlock);
      const safetyAdjustedAmount = Math.max(0, availableAmount * adjustmentMultiplier);
      
      forecasts.push({
        date: forecastDateStr,
        backlog_amount: Math.max(0, backlog),
        daily_unlock_amount: Math.max(0, todayUnlock),
        available_amount: availableAmount,
        safety_adjusted_amount: safetyAdjustedAmount,
        days_since_cashout: Math.ceil((forecastDate.getTime() - lastCashoutDate.getTime()) / (24 * 60 * 60 * 1000))
      });
    }

    console.log(`[DAILY FORECAST] Generated ${forecasts.length} daily forecasts`);

    // Step 8: Delete existing forecasts
    await supabase
      .from('amazon_payouts')
      .delete()
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'forecasted');

    // Step 9: Insert new forecasts
    const payoutRecords = forecasts.map(forecast => ({
      user_id: userId,
      account_id: accountId,
      amazon_account_id: amazonAccountId,
      settlement_id: `daily_forecast_${forecast.date}`,
      payout_date: forecast.date,
      total_amount: forecast.safety_adjusted_amount,
      status: 'forecasted',
      payout_type: 'daily',
      modeling_method: 'delivery_date_plus_7',
      eligible_in_period: forecast.available_amount,
      reserve_amount: 0,
      available_for_daily_transfer: forecast.safety_adjusted_amount,
      total_daily_draws: 0,
      raw_settlement_data: {
        forecast_metadata: {
          model_type: 'delivery_date_plus_7',
          last_cashout_date: lastCashoutDate.toISOString().split('T')[0],
          backlog_amount: forecast.backlog_amount,
          daily_unlock_amount: forecast.daily_unlock_amount,
          available_amount: forecast.available_amount,
          safety_adjusted_amount: forecast.safety_adjusted_amount,
          days_since_cashout: forecast.days_since_cashout,
          risk_adjustment_pct: riskAdjustment,
          growth_factor: growthFactor,
          avg_daily_unlock: avgDailyUnlock
        }
      },
      marketplace_name: amazonAccount.marketplace_name,
      currency_code: 'USD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('amazon_payouts')
      .insert(payoutRecords);

    if (insertError) {
      throw new Error(`Failed to insert forecasts: ${insertError.message}`);
    }

    console.log(`[DAILY FORECAST] Successfully inserted ${payoutRecords.length} forecasts`);

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
