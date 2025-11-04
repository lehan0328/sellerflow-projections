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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from the JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    const userId = user.id;
    console.log('[FORECAST] Fetching Amazon data for user:', userId);

    // Parse request body for custom weights
    const requestBody = await req.json().catch(() => ({}));
    const customWeights = requestBody.customWeights;

    // Get user's account_id and forecast settings
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('account_id, forecast_settings')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.account_id) {
      console.error('[FORECAST] Error fetching profile:', profileError);
      throw new Error('User profile not found');
    }

    const accountId = profile.account_id;

    // Get custom weights from request or profile settings
    const weights = customWeights || profile.forecast_settings?.weights || {
      days30PayoutWeight: 75,
      days60PayoutWeight: 50,
      days90PayoutWeight: 25,
    };

    console.log('[FORECAST] Using custom weights:', weights);

    // Get user's forecast confidence threshold
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('forecast_confidence_threshold')
      .eq('user_id', userId)
      .maybeSingle();

    const riskAdjustment = userSettings?.forecast_confidence_threshold ?? 5; // -5 = Aggressive, 0 = Medium, 5 = Safe, 10 = Very Safe
    console.log('[FORECAST] User risk adjustment:', riskAdjustment, '(-5=Aggressive+5%, 0=Medium, 5=Safe-5%, 10=Very Safe-10%)');

    // Fetch all active Amazon accounts for this user
    const { data: amazonAccounts, error: accountsError } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (accountsError) {
      console.error('[FORECAST] Error fetching Amazon accounts:', accountsError);
      throw new Error('Failed to fetch Amazon accounts');
    }

    if (!amazonAccounts || amazonAccounts.length === 0) {
      throw new Error('No active Amazon accounts found');
    }

    console.log(`[FORECAST] Found ${amazonAccounts.length} active Amazon account(s)`);

    // Delete all existing forecasted payouts for this account before generating new ones
    // This ensures only one set of forecasts exists per account
    console.log(`[FORECAST] Deleting existing forecasts for account: ${accountId}`);
    const { error: deleteError } = await supabase
      .from('amazon_payouts')
      .delete()
      .eq('account_id', accountId)
      .eq('status', 'forecasted');
    
    if (deleteError) {
      console.error('[FORECAST] Error deleting existing forecasts:', deleteError);
    } else {
      console.log('[FORECAST] Successfully deleted all existing forecasts for account');
    }

    // Use 12 months of data for better seasonal analysis
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    // Cutoff for detailed vs aggregated data (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allForecasts: any[] = [];

    // Generate forecasts for each Amazon account
    for (const amazonAccount of amazonAccounts) {
      console.log(`\n[FORECAST] Processing account: ${amazonAccount.account_name} (${amazonAccount.marketplace_name})`);
      console.log(`[FORECAST] Account ID: ${amazonAccount.id}`);
      console.log(`[FORECAST] Payout frequency: ${amazonAccount.payout_frequency}`);
      console.log(`[FORECAST] Payout model: ${amazonAccount.payout_model}`);
      
      // Only forecast for US marketplace
      if (amazonAccount.marketplace_name !== 'United States') {
        console.log(`[FORECAST] Skipping non-US marketplace: ${amazonAccount.marketplace_name}`);
        continue;
      }
      
      // Check if this is a daily settlement account
      const isDaily = amazonAccount.payout_model === 'daily' || amazonAccount.payout_frequency === 'daily';
      console.log(`[FORECAST] Account type: ${isDaily ? 'DAILY' : 'BI-WEEKLY'}`);
      
      // Fetch Amazon payouts for this specific account from last 12 months (US marketplace only)
      const { data: amazonPayoutsRaw, error: payoutsError } = await supabase
        .from('amazon_payouts')
        .select('*')
        .eq('amazon_account_id', amazonAccount.id)
        .eq('status', 'confirmed') // Only use confirmed payouts for baseline
        .eq('marketplace_name', 'United States') // Only US marketplace
        .gte('payout_date', twelveMonthsAgo.toISOString().split('T')[0])
        .order('payout_date', { ascending: false });
      
      // Filter out invoiced settlements (14-day B2B settlements)
      const amazonPayouts = amazonPayoutsRaw?.filter(p => {
        if (!p.raw_settlement_data?.FinancialEventGroupStart || !p.raw_settlement_data?.FinancialEventGroupEnd) {
          return true; // Keep if no duration data
        }
        const start = new Date(p.raw_settlement_data.FinancialEventGroupStart);
        const end = new Date(p.raw_settlement_data.FinancialEventGroupEnd);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return days <= 3; // Only include 1-3 day settlements (daily), not 14-day (invoiced)
      }) || [];
      
      console.log(`[FORECAST] Filtered to ${amazonPayouts.length} daily US settlements (excluded invoiced/B2B settlements)`);
      
      // Also check for Amazon's open settlements (estimated payouts)
      const { data: estimatedPayouts } = await supabase
        .from('amazon_payouts')
        .select('*')
        .eq('amazon_account_id', amazonAccount.id)
        .eq('status', 'estimated') // Amazon's open settlements
        .order('payout_date', { ascending: false })
        .limit(1);

      if (payoutsError) {
        console.error(`[FORECAST] Error fetching payouts for account ${amazonAccount.id}:`, payoutsError);
        continue; // Skip this account and continue with next one
      }

      if (!amazonPayouts || amazonPayouts.length === 0) {
        console.log(`[FORECAST] No historical payouts found for account ${amazonAccount.account_name}, using default assumptions for forecast`);
        
        // Create a basic forecast even without historical data
        // Use industry averages and user's marketplace as baseline
        const defaultDailyPayout = 500; // Conservative daily estimate
        const defaultBiweeklyPayout = 3000; // Conservative bi-weekly estimate
        
        const payoutFrequency = amazonAccount.payout_frequency || 'bi-weekly';
        const baselineAmount = payoutFrequency === 'daily' ? defaultDailyPayout : defaultBiweeklyPayout;
        
        console.log(`[FORECAST] Using default baseline for ${amazonAccount.account_name}: $${baselineAmount} (${payoutFrequency})`);
        
        // Generate simple forecasts without AI
        const simpleForecasts: any[] = [];
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0); // Start from today, not tomorrow
        
        const maxForecasts = payoutFrequency === 'daily' ? 90 : 6;
        const incrementDays = payoutFrequency === 'daily' ? 1 : 14;
        
        for (let i = 0; i < maxForecasts; i++) {
          const forecastDate = new Date(startDate);
          forecastDate.setDate(forecastDate.getDate() + (i * incrementDays));
          
          // Apply risk adjustment
          const adjustmentMultiplier = 1 - (riskAdjustment / 100);
          const adjustedAmount = baselineAmount * adjustmentMultiplier;
          
          simpleForecasts.push({
            user_id: userId,
            account_id: amazonAccount.account_id,
            amazon_account_id: amazonAccount.id,
            settlement_id: `forecast_${crypto.randomUUID()}_${forecastDate.toISOString().split('T')[0]}`,
            payout_date: forecastDate.toISOString().split('T')[0],
            total_amount: Math.max(0, adjustedAmount),
            orders_total: adjustedAmount * 1.3,
            fees_total: adjustedAmount * 0.15,
            refunds_total: 0,
            other_total: 0,
            currency_code: 'USD',
            status: 'forecasted',
            payout_type: payoutFrequency,
            marketplace_name: amazonAccount.marketplace_name
          });
        }
        
        allForecasts.push(...simpleForecasts);
        continue; // Skip AI analysis for this account
      }

      // Fetch daily rollups for net income trend analysis (actual profit after all fees)
      const { data: dailyRollups, error: rollupsError } = await supabase
        .from('amazon_daily_rollups')
        .select('rollup_date, total_net, total_revenue, order_count')
        .eq('amazon_account_id', amazonAccount.id)
        .gte('rollup_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('rollup_date', { ascending: false });
      
      // Also fetch recent detailed transactions for other analysis
      const { data: recentTransactions, error: recentTxError } = await supabase
        .from('amazon_transactions')
        .select('*')
        .eq('amazon_account_id', amazonAccount.id)
        .gte('transaction_date', thirtyDaysAgo.toISOString())
        .order('transaction_date', { ascending: false });
      
      // Fetch aggregated historical data (30 days - 12 months ago) for seasonal patterns
      const { data: historicalSummary, error: historicalError } = await supabase
        .from('amazon_transactions_daily_summary')
        .select('*')
        .eq('amazon_account_id', amazonAccount.id)
        .gte('transaction_date', twelveMonthsAgo.toISOString().split('T')[0])
        .lt('transaction_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false });
      
      // Combine recent detailed + historical aggregated for full picture
      const amazonTransactions = recentTransactions || [];
      
      // Convert daily summaries to transaction-like format for compatibility
      const historicalTransactions = (historicalSummary || []).map(summary => ({
        transaction_date: summary.transaction_date,
        transaction_type: 'Daily Summary',
        amount: summary.net_amount,
        gross_amount: summary.orders_total,
        marketplace_name: summary.marketplace_name,
        currency_code: summary.currency_code,
        settlement_id: summary.settlement_id
      }));
      
      const transactionsError = rollupsError || recentTxError || historicalError;

      if (transactionsError) {
        console.error(`[FORECAST] Error fetching data for account ${amazonAccount.id}:`, transactionsError);
      }

      // Aggregate transaction data by type for analysis
      const transactionsByType = {
        orders: amazonTransactions?.filter(t => t.transaction_type === 'Order' || t.transaction_type === 'Sale') || [],
        fees: amazonTransactions?.filter(t => t.transaction_type?.includes('Fee')) || [],
        refunds: amazonTransactions?.filter(t => t.transaction_type === 'Refund') || [],
        returns: amazonTransactions?.filter(t => t.transaction_type === 'Return') || [],
      };

      // Calculate monthly transaction aggregates with recent data weighted 2x
      const monthlyTransactions: any = {};
      amazonTransactions?.forEach((txn: any) => {
      const monthKey = txn.transaction_date.substring(0, 7);
      if (!monthlyTransactions[monthKey]) {
        monthlyTransactions[monthKey] = {
          month: monthKey,
          orders_amount: 0,
          fees_amount: 0,
          refunds_amount: 0,
          returns_amount: 0,
          net_amount: 0,
          transaction_count: 0
        };
      }
      const amount = Number(txn.amount || 0);
      monthlyTransactions[monthKey].transaction_count += 1;
      
      if (txn.transaction_type === 'Order' || txn.transaction_type === 'Sale') {
        monthlyTransactions[monthKey].orders_amount += amount;
      } else if (txn.transaction_type?.includes('Fee')) {
        monthlyTransactions[monthKey].fees_amount += Math.abs(amount);
      } else if (txn.transaction_type === 'Refund') {
        monthlyTransactions[monthKey].refunds_amount += Math.abs(amount);
      } else if (txn.transaction_type === 'Return') {
        monthlyTransactions[monthKey].returns_amount += Math.abs(amount);
      }
      monthlyTransactions[monthKey].net_amount += amount;
      });

      console.log(`[FORECAST] Data fetched for ${amazonAccount.account_name}`, {
      payoutCount: amazonPayouts?.length || 0,
      transactionCount: amazonTransactions?.length || 0,
      recentTransactionCount: recentTransactions.length,
      transactionBreakdown: {
        orders: transactionsByType.orders.length,
        fees: transactionsByType.fees.length,
        refunds: transactionsByType.refunds.length,
        returns: transactionsByType.returns.length
      },
      monthlyTransactions: Object.keys(monthlyTransactions).length
      });

      // Aggregate monthly data for better trend analysis
      const monthlyData: any = {};
      amazonPayouts.forEach((payout: any) => {
      const monthKey = payout.payout_date.substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          total_amount: 0,
          payout_count: 0,
          avg_amount: 0,
          orders_total: 0,
          fees_total: 0,
          refunds_total: 0
        };
      }
      monthlyData[monthKey].total_amount += Number(payout.total_amount || 0);
      monthlyData[monthKey].orders_total += Number(payout.orders_total || 0);
      monthlyData[monthKey].fees_total += Number(payout.fees_total || 0);
      monthlyData[monthKey].refunds_total += Number(payout.refunds_total || 0);
      monthlyData[monthKey].payout_count += 1;
    });

      // Calculate averages
    Object.keys(monthlyData).forEach(month => {
      monthlyData[month].avg_amount = monthlyData[month].total_amount / monthlyData[month].payout_count;
    });

    const historicalData = Object.values(monthlyData).sort((a: any, b: any) => 
      a.month.localeCompare(b.month)
    );

    // Calculate seasonal multipliers from historical data
    const seasonalMultipliers: Record<number, number> = {}; // month (1-12) -> multiplier
    if (historicalData.length >= 6) {
      // Calculate average payout across all months
      const avgMonthlyPayout = historicalData.reduce((sum: number, m: any) => sum + m.avg_amount, 0) / historicalData.length;
      
      // Calculate multiplier for each calendar month based on historical performance
      const monthPerformance: Record<number, number[]> = {}; // month -> [amounts]
      
      historicalData.forEach((m: any) => {
        const monthNum = parseInt(m.month.split('-')[1]); // Extract month (1-12)
        if (!monthPerformance[monthNum]) {
          monthPerformance[monthNum] = [];
        }
        monthPerformance[monthNum].push(m.avg_amount);
      });
      
      // Calculate average for each month and derive multiplier
      Object.keys(monthPerformance).forEach(monthStr => {
        const monthNum = parseInt(monthStr);
        const amounts = monthPerformance[monthNum];
        const monthAvg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
        const rawMultiplier = avgMonthlyPayout > 0 ? monthAvg / avgMonthlyPayout : 1.0;
        // Cap seasonal variation to ±15% for realistic forecasts (prevent wild swings)
        seasonalMultipliers[monthNum] = Math.max(0.85, Math.min(1.15, rawMultiplier));
      });
      
      console.log('[FORECAST] Seasonal multipliers calculated:', seasonalMultipliers);
      console.log('[FORECAST] Example: Q4 months typically show higher multipliers (Oct=10, Nov=11, Dec=12)');
    } else {
      console.log('[FORECAST] Insufficient data for seasonal analysis (need 6+ months)');
      // Default multipliers - slight boost for Q4
      for (let i = 1; i <= 12; i++) {
        if (i >= 10 && i <= 12) {
          seasonalMultipliers[i] = 1.15; // Q4 boost
        } else {
          seasonalMultipliers[i] = 1.0;
        }
      }
    }
    
    // Calculate weighted average payout for baseline (prioritize recent payouts)
    // Recent payouts are more indicative of current business performance
    const nonForecastedPayouts = amazonPayouts.filter(p => p.status !== 'forecasted');
    
    // Use weighted average: recent payouts get higher weight
    let weightedSum = 0;
    let totalWeight = 0;
    nonForecastedPayouts.forEach((payout, index) => {
      // Most recent payout gets weight of payoutCount, oldest gets weight of 1
      const weight = nonForecastedPayouts.length - index;
      weightedSum += Number(payout.total_amount) * weight;
      totalWeight += weight;
      });
      
      const avgPayoutAmount = totalWeight > 0 ? weightedSum / totalWeight : 0;
      
      // Also calculate simple average for comparison
      const simpleAvg = nonForecastedPayouts.reduce((sum, p) => sum + Number(p.total_amount), 0) / Math.max(1, nonForecastedPayouts.length);
      
      console.log(`[FORECAST] Historical Analysis for ${amazonAccount.account_name}:`, {
        totalPayouts: amazonPayouts.length,
        monthlyDataPoints: historicalData.length,
        weightedAveragePayoutAmount: avgPayoutAmount,
        simpleAveragePayoutAmount: simpleAvg,
        historicalMonthly: historicalData,
        dateRange: `${amazonPayouts[amazonPayouts.length - 1]?.payout_date} to ${amazonPayouts[0]?.payout_date}`,
        note: 'Payout amounts are NET (after all Amazon fees deducted)'
      });

      console.log(`[FORECAST] Using mathematical forecasting for ${amazonAccount.account_name} (AI generation removed)`);

      // Generate mathematical forecasts without AI
      {
        const payoutFrequency = amazonAccount.payout_frequency || 'bi-weekly';
        
        // Determine starting date for forecasts
        // If Amazon has an open settlement (estimated), use it as FIRST payout for bi-weekly
        let lastPayoutDate;
        let hasOpenSettlement = false;
        let openSettlementAmount = 0;
        let openSettlementPayout = null;
        
        if (estimatedPayouts && estimatedPayouts.length > 0) {
          // Amazon already provided the next payout estimate
          hasOpenSettlement = true;
          openSettlementAmount = Number(estimatedPayouts[0].total_amount || 0);
          console.log(`[FORECAST] Found Amazon open settlement for ${amazonAccount.account_name}:`);
          console.log(`  - Date: ${estimatedPayouts[0].payout_date}`);
          console.log(`  - Amount: $${openSettlementAmount}`);
          
          // For BI-WEEKLY payouts: Use open settlement as the FIRST forecasted payout
          if (payoutFrequency === 'bi-weekly') {
            lastPayoutDate = new Date(estimatedPayouts[0].payout_date);
            console.log(`  - BI-WEEKLY: Will use open settlement as first payout, then generate additional forecasts`);
            
            // Create the open settlement as a forecasted payout with unique ID
            openSettlementPayout = {
              user_id: userId,
              account_id: amazonAccount.account_id,
              amazon_account_id: amazonAccount.id,
              payout_date: estimatedPayouts[0].payout_date,
              total_amount: openSettlementAmount,
              settlement_id: `forecast_${crypto.randomUUID()}_${estimatedPayouts[0].payout_date}`,
              marketplace_name: amazonAccount.marketplace_name || 'Amazon',
              status: 'forecasted',
              payout_type: payoutFrequency,
              currency_code: estimatedPayouts[0].currency_code || 'USD',
              transaction_count: 0,
              fees_total: 0,
              orders_total: 0,
              refunds_total: 0,
              other_total: 0,
              raw_settlement_data: {
                forecast_metadata: {
                  method: 'amazon_open_settlement',
                  confidence: 95,
                  note: 'Using Amazon provided open settlement amount'
                }
              }
            };
          } else if (payoutFrequency === 'daily') {
            console.log(`  - DAILY: Using open settlement for daily forecasts`);
            
            // For daily accounts with open settlement, skip the cumulative distribution
            // The standard daily forecast logic will handle it
            lastPayoutDate = new Date(estimatedPayouts[0].payout_date);
            lastPayoutDate.setDate(lastPayoutDate.getDate() - 1); // Start forecasts from the day before settlement
            console.log(`  - Set lastPayoutDate to ${lastPayoutDate.toISOString().split('T')[0]} (day before settlement)`);
          }
        } else {
          // No open settlement - use last confirmed payout's settlement close date
          if (amazonPayouts.length > 0) {
            const lastPayout = amazonPayouts[0];
            const rawData = lastPayout.raw_settlement_data as any;
            const settlementEndDate = rawData?.FinancialEventGroupEnd;
            
            if (settlementEndDate && payoutFrequency === 'daily') {
              // FinancialEventGroupEnd is the actual settlement close date (not next day)
              const closeDate = new Date(settlementEndDate);
              closeDate.setHours(0, 0, 0, 0);
              lastPayoutDate = closeDate;
              console.log(`[FORECAST] Settlement closed: ${lastPayoutDate.toISOString().split('T')[0]} (payout: ${lastPayout.payout_date})`);
            } else {
              // Fallback to payout date for bi-weekly or if no settlement data
              lastPayoutDate = new Date(lastPayout.payout_date);
              console.log(`[FORECAST] Using payout date: ${lastPayoutDate.toISOString().split('T')[0]}`);
            }
          } else {
            // Fallback to yesterday if no confirmed payouts exist
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            lastPayoutDate = yesterday;
            console.log(`[FORECAST] No confirmed payouts, lastPayoutDate set to ${lastPayoutDate.toISOString().split('T')[0]}`);
          }
        }
        
        // Calculate baseline amount using different strategies for daily vs bi-weekly
        let baselineAmount;
        
        // Declare baseline variables at broader scope for later use
        let baseline30Days = 0;
        let baseline60Days = 0;
        let baseline90Days = 0;
        
        if (payoutFrequency === 'daily') {
          // ===== DAILY ACCOUNTS: Use simple 30-day payout average =====
          console.log(`[FORECAST] Daily account - calculating 30-day payout average for ${amazonAccount.account_name}`);
          
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const recent30DayPayouts = amazonPayouts.filter(p => {
            const payoutDate = new Date(p.payout_date);
            return payoutDate >= thirtyDaysAgo && p.status === 'confirmed';
          });
          
          if (recent30DayPayouts.length >= 3) {
            // Calculate simple 30-day average
            const totalPayoutAmount = recent30DayPayouts.reduce((sum, p) => sum + Number(p.total_amount), 0);
            
            // Find actual date range of payouts
            const oldestPayoutDate = new Date(Math.min(...recent30DayPayouts.map(p => new Date(p.payout_date).getTime())));
            const newestPayoutDate = new Date(Math.max(...recent30DayPayouts.map(p => new Date(p.payout_date).getTime())));
            const daysInPeriod = Math.ceil((newestPayoutDate.getTime() - oldestPayoutDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            
            // Simple daily average from actual payout amounts
            const thirtyDayAverage = totalPayoutAmount / daysInPeriod;
            
            console.log(`[FORECAST] 30-day payout baseline:`, {
              totalAmount: totalPayoutAmount.toFixed(2),
              daysInPeriod,
              payoutsCount: recent30DayPayouts.length,
              dailyAverage: thirtyDayAverage.toFixed(2),
              avgPayoutSize: (totalPayoutAmount / recent30DayPayouts.length).toFixed(2),
              dateRange: `${oldestPayoutDate.toISOString().split('T')[0]} to ${newestPayoutDate.toISOString().split('T')[0]}`
            });
            
            // Use simple average for all baselines (no transaction weighting)
            baseline30Days = thirtyDayAverage;
            baseline60Days = thirtyDayAverage;
            baseline90Days = thirtyDayAverage;
            baselineAmount = thirtyDayAverage;
          } else {
            // Insufficient payout history - fall back to all available payouts
            console.log(`[FORECAST] Insufficient 30-day history (${recent30DayPayouts.length} payouts), using all available payouts`);
            
            if (nonForecastedPayouts.length > 0) {
              const oldestPayoutDate = new Date(nonForecastedPayouts[nonForecastedPayouts.length - 1].payout_date);
              const newestPayoutDate = new Date(nonForecastedPayouts[0].payout_date);
              const daysDiff = Math.ceil((newestPayoutDate.getTime() - oldestPayoutDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              const totalPayoutAmount = nonForecastedPayouts.reduce((sum, p) => sum + Number(p.total_amount), 0);
              baselineAmount = daysDiff > 0 ? totalPayoutAmount / daysDiff : simpleAvg;
              
              // Set all horizon baselines to the same value since we don't have enough data to differentiate
              baseline30Days = baselineAmount;
              baseline60Days = baselineAmount;
              baseline90Days = baselineAmount;
              
              console.log(`[FORECAST] Using all available payouts:`, {
                totalAmount: totalPayoutAmount.toFixed(2),
                daysInPeriod: daysDiff,
                dailyAverage: baselineAmount.toFixed(2)
              });
            } else {
              baselineAmount = 1000; // Conservative default
              baseline30Days = baselineAmount;
              baseline60Days = baselineAmount;
              baseline90Days = baselineAmount;
              console.log(`[FORECAST] No payout history, using conservative default: ${baselineAmount}`);
            }
          }
          
        } else {
          // ===== BI-WEEKLY ACCOUNTS: Use transaction-based calculation =====
          console.log(`[FORECAST] Bi-weekly account - calculating from transaction data for ${amazonAccount.account_name}`);
          
          if (!amazonTransactions || amazonTransactions.length === 0) {
            // Fallback to payout history
            console.log(`[FORECAST] No transaction data, using payout average`);
            baselineAmount = avgPayoutAmount;
          } else {
            // Calculate from transactions
            let totalOrders = 0;
            let totalFees = 0;
            let totalRefunds = 0;
            
            amazonTransactions.forEach(txn => {
              const amount = Number(txn.amount || 0);
              if (txn.transaction_type === 'Order' || txn.transaction_type === 'Sale') {
                totalOrders += amount;
              } else if (txn.transaction_type?.includes('Fee')) {
                totalFees += Math.abs(amount);
              } else if (txn.transaction_type === 'Refund') {
                totalRefunds += Math.abs(amount);
              }
            });
            
            const netTransactionValue = totalOrders - totalFees - totalRefunds;
            
            // Calculate daily average from transaction data
            const oldestTxDate = new Date(amazonTransactions[amazonTransactions.length - 1].transaction_date);
            const newestTxDate = new Date(amazonTransactions[0].transaction_date);
            const transactionDays = Math.max(1, Math.ceil((newestTxDate.getTime() - oldestTxDate.getTime()) / (1000 * 60 * 60 * 24)));
            const dailyAverage = netTransactionValue / transactionDays;
            
            console.log(`[FORECAST] Bi-weekly transaction calculation:`, {
              totalOrders,
              totalFees,
              totalRefunds,
              netTransactionValue,
              transactionDays,
              dailyAverage,
              biweeklyAmount: (dailyAverage * 14).toFixed(2)
            });
            
            // For bi-weekly: multiply daily average by 14
            baselineAmount = dailyAverage * 14;
          }
          
          // Set baseline variables for bi-weekly (same value for all horizons)
          baseline30Days = baselineAmount;
          baseline60Days = baselineAmount;
          baseline90Days = baselineAmount;
        }
        
        // Calculate 30-day growth trend to apply to forecasts
        let growthMultiplier = 1.0; // Default: no growth adjustment
        
        const growthThirtyDaysAgo = new Date();
        growthThirtyDaysAgo.setDate(growthThirtyDaysAgo.getDate() - 30);
        const growthSixtyDaysAgo = new Date();
        growthSixtyDaysAgo.setDate(growthSixtyDaysAgo.getDate() - 60);
        
        const last30DaysPayouts = amazonPayouts.filter(p => {
          const date = new Date(p.payout_date);
          return date >= growthThirtyDaysAgo && p.status === 'confirmed';
        });
        
        const prev30DaysPayouts = amazonPayouts.filter(p => {
          const date = new Date(p.payout_date);
          return date >= growthSixtyDaysAgo && date < growthThirtyDaysAgo && p.status === 'confirmed';
        });
        
        if (last30DaysPayouts.length >= 3 && prev30DaysPayouts.length >= 3) {
          const last30Total = last30DaysPayouts.reduce((sum, p) => sum + Number(p.total_amount), 0);
          const prev30Total = prev30DaysPayouts.reduce((sum, p) => sum + Number(p.total_amount), 0);
          
          if (prev30Total > 0) {
            const growthRate = ((last30Total - prev30Total) / prev30Total);
            // Cap growth adjustment to ±30% to prevent unrealistic forecasts
            const cappedGrowthRate = Math.max(-0.30, Math.min(0.30, growthRate));
            growthMultiplier = 1 + cappedGrowthRate;
            
            console.log(`[FORECAST] ${amazonAccount.account_name} - 30-Day Growth Trend:`, {
              last30Days: last30Total.toFixed(2),
              prev30Days: prev30Total.toFixed(2),
              growthRate: (growthRate * 100).toFixed(1) + '%',
              cappedRate: (cappedGrowthRate * 100).toFixed(1) + '%',
              multiplier: growthMultiplier.toFixed(3),
              note: 'Growth trend applied to baseline forecasts'
            });
          }
        } else {
          console.log(`[FORECAST] ${amazonAccount.account_name} - Insufficient data for growth trend (need 3+ payouts in each 30-day period)`);
        }
        
        // Generate forecasts for 3 months based on frequency
        const forecastedPayouts: any[] = [];
        
        // For BI-WEEKLY: If we have an open settlement, add it as the FIRST forecasted payout
        if (openSettlementPayout) {
          forecastedPayouts.push(openSettlementPayout);
          console.log(`[FORECAST] ✅ Added open settlement as first bi-weekly forecast: $${openSettlementAmount} on ${openSettlementPayout.payout_date}`);
        }
        
        const threeMonthsOut = new Date(lastPayoutDate);
        threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);
        
        let currentDate = new Date(lastPayoutDate);
        let biweeklyPeriodIndex = 0;
        let dayCount = 0;
        
        // For daily: generate 90 daily payouts (3 months)
        // For bi-weekly: generate 6 bi-weekly payouts (3 months)
        // If we already added open settlement for bi-weekly, generate 5 more (total 6)
        const maxForecasts = payoutFrequency === 'daily' ? 90 : (openSettlementPayout ? 5 : 6);
        
        // For daily payouts, analyze last 14 days of sales to predict next 14 days
        let last14DaysSales: number[] = [];
        let recentSalesTrend = 0;
        
        if (payoutFrequency === 'daily' && amazonTransactions && amazonTransactions.length > 0) {
          // Get last 14 days of transaction data (orders only)
          const fourteenDaysAgo = new Date();
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
          
          const recentOrders = amazonTransactions
            .filter(t => 
              (t.transaction_type === 'Order' || t.transaction_type === 'Sale') &&
              new Date(t.transaction_date) >= fourteenDaysAgo
            )
            .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
          
          // Group by day and calculate net sales per day
          const dailySales: { [key: string]: number } = {};
          recentOrders.forEach(txn => {
            const dayKey = txn.transaction_date.split('T')[0];
            if (!dailySales[dayKey]) dailySales[dayKey] = 0;
            dailySales[dayKey] += Number(txn.amount || 0);
          });
          
          // Convert to array of daily amounts
          last14DaysSales = Object.values(dailySales);
          
          // Calculate trend (simple linear regression slope)
          if (last14DaysSales.length >= 3) {
            const n = last14DaysSales.length;
            const xMean = (n - 1) / 2;
            const yMean = last14DaysSales.reduce((a, b) => a + b, 0) / n;
            
            let numerator = 0;
            let denominator = 0;
            for (let i = 0; i < n; i++) {
              numerator += (i - xMean) * (last14DaysSales[i] - yMean);
              denominator += (i - xMean) ** 2;
            }
            
            recentSalesTrend = denominator !== 0 ? numerator / denominator : 0;
          }
          
          console.log(`[FORECAST] ${amazonAccount.account_name} - Last 14 days sales analysis:`, {
            daysWithSales: last14DaysSales.length,
            avgDailySales: last14DaysSales.length > 0 ? (last14DaysSales.reduce((a, b) => a + b, 0) / last14DaysSales.length).toFixed(2) : 0,
            trend: recentSalesTrend > 0 ? 'increasing' : recentSalesTrend < 0 ? 'decreasing' : 'stable',
            trendValue: recentSalesTrend.toFixed(2)
          });
        }
        
        console.log(`[FORECAST] Starting forecast generation for ${amazonAccount.account_name}:`, {
          payoutFrequency,
          maxForecasts,
          lastPayoutDate: lastPayoutDate.toISOString().split('T')[0],
          threeMonthsOut: threeMonthsOut.toISOString().split('T')[0],
          baselineAmount,
          usingSalesTrendForFirst14Days: payoutFrequency === 'daily' && last14DaysSales.length > 0
        });
        
        while (currentDate <= threeMonthsOut && dayCount < maxForecasts) {
          // Move to next payout date based on frequency
          if (payoutFrequency === 'daily') {
            currentDate.setDate(currentDate.getDate() + 1);
            dayCount++;
            // For daily, we just use the daily average (no AI prediction division needed)
            biweeklyPeriodIndex = Math.floor((dayCount - 1) / 14);
          } else { // bi-weekly = every 14 days
            currentDate.setDate(currentDate.getDate() + 14);
            biweeklyPeriodIndex = dayCount;
            dayCount++;
          }
          
          if (currentDate > threeMonthsOut) break;
          
          // Use consistent baseline across all time periods (no drop-off)
          const dailyBaseline = baseline30Days;
          const horizonType = 'consistent';
          
          // FORECASTING: Baseline + Seasonal Adjustments + Daily Variation + Safety Net
          let calculationMethod = 'safety_net_average_with_variation';
          
          // Apply seasonal adjustments to baseline
          const forecastMonth = currentDate.getMonth() + 1; // 1-12
          const seasonalMultiplier = seasonalMultipliers[forecastMonth] || 1.0;
          let basePrediction = dailyBaseline * seasonalMultiplier;
          
          // Apply 30-day growth trend
          basePrediction = basePrediction * growthMultiplier;
          
          // Add realistic daily variation (±2.5% deterministic variation based on date)
          // This creates natural-looking variation without causing actual randomness
          const dateStr = currentDate.toISOString().split('T')[0];
          const dateSeed = dateStr.split('-').reduce((acc, val) => acc + parseInt(val), 0);
          const variationPercent = (((dateSeed * 7919) % 100) / 100 - 0.5) * 0.05; // ±2.5%
          const dailyVariation = 1 + variationPercent;
          basePrediction = basePrediction * dailyVariation;
          
          // Log calculation on first day and sample days
          if (dayCount === 1) {
            console.log(`[FORECAST] ${amazonAccount.account_name} - Forecast Calculation:`);
            console.log(`  - Baseline: $${dailyBaseline.toFixed(2)}`);
            console.log(`  - Seasonal (Month ${forecastMonth}): ${(seasonalMultiplier * 100).toFixed(1)}%`);
            console.log(`  - Growth Trend: ${(growthMultiplier * 100).toFixed(1)}%`);
            console.log(`  - Daily Variation: ${(dailyVariation * 100 - 100).toFixed(2)}%`);
            console.log(`  - Result: $${basePrediction.toFixed(2)}`);
          }
          
          // Apply safety net reduction (3%, 8%, or 15% depending on user setting)
          const safetyNetMultiplier = 1 - (riskAdjustment / 100);
          const predictedAmount = Math.round(basePrediction * safetyNetMultiplier);
          
          // Log safety net calculation on first day
          if (dayCount === 1) {
            console.log(`[FORECAST] ${amazonAccount.account_name} - Safety Net Applied: ${riskAdjustment}% reduction`);
            console.log(`[FORECAST] Multiplier: ${safetyNetMultiplier.toFixed(3)} (${(safetyNetMultiplier * 100).toFixed(1)}% of baseline)`);
            console.log(`[FORECAST] Base ${basePrediction.toFixed(2)} × ${safetyNetMultiplier.toFixed(3)} = ${predictedAmount.toFixed(2)}`);
          }
          
          // Use a fixed 5% confidence range for all risk levels
          const confidenceRange = 0.05;
          
          // Log day forecast for verification (sample every 10 days and first 3)
          if (dayCount <= 3 || dayCount % 10 === 0 || (payoutFrequency === 'bi-weekly')) {
            console.log(`[FORECAST] ${amazonAccount.account_name} - Day ${dayCount} (${currentDate.toISOString().split('T')[0]}): $${predictedAmount} | baseline: $${dailyBaseline.toFixed(2)} → seasonal: ${(seasonalMultiplier * 100).toFixed(0)}% → growth: ${(growthMultiplier * 100).toFixed(0)}% → variation: ${(dailyVariation * 100 - 100).toFixed(1)}% → safety: ${(safetyNetMultiplier * 100).toFixed(0)}%`);
          }
          
          const forecastPayout = {
            user_id: userId,
            account_id: accountId,
            amazon_account_id: amazonAccount.id,
            payout_date: currentDate.toISOString().split('T')[0],
            total_amount: Math.round(predictedAmount),
            settlement_id: `forecast_${crypto.randomUUID()}_${currentDate.toISOString().split('T')[0]}`,
            marketplace_name: amazonAccount.marketplace_name || 'Amazon',
            status: 'forecasted',
            payout_type: payoutFrequency,
            modeling_method: 'auren_forecast_v1',
            currency_code: amazonPayouts.length > 0 ? (amazonPayouts[0].currency_code || 'USD') : 'USD',
            transaction_count: 0,
            fees_total: 0,
            orders_total: 0,
            refunds_total: 0,
            other_total: 0,
            raw_settlement_data: {
              forecast_metadata: {
                confidence: 0.85,
                risk_adjustment: riskAdjustment,
                risk_level: riskAdjustment === -5 ? 'aggressive' : riskAdjustment === 0 ? 'medium' : riskAdjustment === 5 ? 'safe' : 'very_safe',
                upper_bound: Math.round(predictedAmount * (1 + confidenceRange)),
                lower_bound: Math.round(predictedAmount * (1 - confidenceRange)),
                period: payoutFrequency === 'daily' ? `Day ${dayCount}` : `Forecast ${biweeklyPeriodIndex + 1}`,
                generated_at: new Date().toISOString(),
                frequency: payoutFrequency,
                calculation_method: calculationMethod,
                horizon_type: horizonType,
                baseline_amount: dailyBaseline,
                demo_multiplier: 1,
                base_prediction: basePrediction,
                seasonal_multiplier: seasonalMultiplier,
                growth_multiplier: growthMultiplier,
                seasonally_adjusted: basePrediction,
                risk_multiplier: 1 - (riskAdjustment / 100)
              }
            }
          };
          
          forecastedPayouts.push(forecastPayout);
          
          if (dayCount <= 3 || dayCount % 14 === 0 || (payoutFrequency === 'bi-weekly')) {
            console.log(`[FORECAST] ${amazonAccount.account_name} - Generated forecast ${dayCount}:`, {
              date: forecastPayout.payout_date,
              amount: forecastPayout.total_amount,
              method: calculationMethod
            });
          }
        }

        // Add forecasts from this account to the collection
        allForecasts.push(...forecastedPayouts);

        console.log(`[FORECAST] ✅ Generated ${forecastedPayouts.length} forecasts for ${amazonAccount.account_name}`, {
          frequency: payoutFrequency,
          expectedMax: maxForecasts,
          actualGenerated: forecastedPayouts.length,
          dateRange: forecastedPayouts.length > 0 ? {
            first: forecastedPayouts[0].payout_date,
            last: forecastedPayouts[forecastedPayouts.length - 1].payout_date
          } : 'none'
        });
      }
    } // End of amazon account loop

    // Insert all forecasted payouts for all accounts
    if (allForecasts.length > 0) {
      console.log(`[FORECAST] Inserting ${allForecasts.length} total forecasted payouts for ${amazonAccounts.length} account(s)...`);
      
      // First, delete existing forecasted payouts for these accounts
      const accountIds = amazonAccounts.map(acc => acc.id);
      const { error: deleteError } = await supabase
        .from('amazon_payouts')
        .delete()
        .in('amazon_account_id', accountIds)
        .eq('status', 'forecasted');

      if (deleteError) {
        console.error('[FORECAST] Error deleting old forecasted payouts:', deleteError);
      } else {
        console.log(`[FORECAST] Deleted old forecasted payouts for ${accountIds.length} account(s)`);
      }
      
      const { error: insertError } = await supabase
        .from('amazon_payouts')
        .insert(allForecasts);

      if (insertError) {
        console.error('[FORECAST] Error storing forecasted payouts:', insertError);
        throw new Error('Failed to store forecasted payouts');
      } else {
        console.log(`[FORECAST] ✅ Successfully stored ${allForecasts.length} total forecasted payouts`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Generated ${allForecasts.length} forecasts for ${amazonAccounts.length} Amazon account(s)`,
        accountsProcessed: amazonAccounts.length,
        totalForecasts: allForecasts.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[FORECAST] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
