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

    // Get user's account_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.account_id) {
      console.error('[FORECAST] Error fetching profile:', profileError);
      throw new Error('User profile not found');
    }

    const accountId = profile.account_id;

    // Get user's forecast confidence threshold and advanced modeling setting
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('forecast_confidence_threshold, advanced_modeling_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    const riskAdjustment = userSettings?.forecast_confidence_threshold ?? 5; // -5 = Aggressive, 0 = Medium, 5 = Safe, 10 = Very Safe
    const advancedModelingEnabled = userSettings?.advanced_modeling_enabled ?? false;
    console.log('[FORECAST] User risk adjustment:', riskAdjustment, '(-5=Aggressive+5%, 0=Medium, 5=Safe-5%, 10=Very Safe-10%)');
    console.log('[FORECAST] Advanced modeling:', advancedModelingEnabled ? 'ENABLED' : 'DISABLED');

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
      console.log(`[FORECAST] DEBUG - payout_frequency: ${amazonAccount.payout_frequency}`);
      console.log(`[FORECAST] DEBUG - payout_model: ${amazonAccount.payout_model}`);
      console.log(`[FORECAST] DEBUG - advancedModelingEnabled: ${advancedModelingEnabled}`);
      
      // Check if this is a daily settlement account
      const isDaily = amazonAccount.payout_model === 'daily' || amazonAccount.payout_frequency === 'daily';
      console.log(`[FORECAST] DEBUG - isDaily: ${isDaily}`);
      
      if (isDaily) {
        // If advanced modeling is enabled, use the specialized daily forecast function
        if (advancedModelingEnabled) {
          console.log(`✅ [FORECAST] ${amazonAccount.account_name} is DAILY account with ADVANCED MODELING - routing to backlog-based forecast`);
          console.log(`[FORECAST] Account details:`, {
            payout_model: amazonAccount.payout_model,
            payout_frequency: amazonAccount.payout_frequency,
            account_id: amazonAccount.id
          });
          
          try {
            const { data: dailyForecastResult, error: dailyError } = await supabase.functions.invoke('forecast-amazon-payouts-daily', {
              body: {
                amazonAccountId: amazonAccount.id,
                userId: userId,
                accountId: accountId
              }
            });
            
            if (dailyError) {
              console.error(`❌ [FORECAST] Error in daily forecast for ${amazonAccount.account_name}:`, dailyError);
            } else {
              console.log(`✅ [FORECAST] Daily forecast completed for ${amazonAccount.account_name}:`, dailyForecastResult);
            }
          } catch (dailyError) {
            console.error(`❌ [FORECAST] Exception in daily forecast:`, dailyError);
          }
          
          continue; // Skip standard logic for this account
        }
        
        // Otherwise, continue with standard daily logic in this function
        console.log(`✅ [FORECAST] ${amazonAccount.account_name} is DAILY account - using standard daily forecast logic`);
      }
      
      // If not daily, it's a bi-weekly account
      if (amazonAccount.payout_frequency !== 'daily' && amazonAccount.payout_model !== 'daily') {
        console.log(`ℹ️ [FORECAST] ${amazonAccount.account_name} is BI-WEEKLY account - using standard forecast logic`);
      }
      
      // Fetch Amazon payouts for this specific account from last 12 months
      const { data: amazonPayouts, error: payoutsError } = await supabase
        .from('amazon_payouts')
        .select('*')
        .eq('amazon_account_id', amazonAccount.id)
        .eq('status', 'confirmed') // Only use confirmed payouts for baseline
        .gte('payout_date', twelveMonthsAgo.toISOString().split('T')[0])
        .order('payout_date', { ascending: false });
      
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
        startDate.setDate(startDate.getDate() + 1); // Start tomorrow
        
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

      // Fetch recent detailed transactions (last 30 days) for accurate forecasting
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
      
      const transactionsError = recentTxError || historicalError;

      if (transactionsError) {
        console.error(`[FORECAST] Error fetching transactions for account ${amazonAccount.id}:`, transactionsError);
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
            console.log(`  - DAILY: Generating cumulative distribution for open settlement`);
            
            // For daily accounts, set lastPayoutDate to 2 days ago so forecasts start from today
            // This ensures forecasts start today regardless of open settlement dates
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            lastPayoutDate = twoDaysAgo;
            console.log(`  - Set lastPayoutDate to 2 days ago (${twoDaysAgo.toISOString().split('T')[0]}) for daily account - forecasts will start today`);
            
            // Fetch total draws already made in this settlement
            const { data: existingDraws } = await supabase
              .from('amazon_daily_draws')
              .select('amount')
              .eq('amazon_account_id', amazonAccount.id)
              .eq('settlement_id', estimatedPayouts[0].settlement_id);
            
            const totalDrawn = existingDraws?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
            
            // Fetch recent transaction volume for weighting
            const { data: recentVolume } = await supabase
              .from('amazon_transactions_daily_summary')
              .select('transaction_date, net_amount')
              .eq('amazon_account_id', amazonAccount.id)
              .gte('transaction_date', estimatedPayouts[0].raw_settlement_data?.settlement_start_date || estimatedPayouts[0].settlement_start_date)
              .order('transaction_date', { ascending: true });
            
            console.log(`  - Settlement: ${estimatedPayouts[0].settlement_start_date} to ${estimatedPayouts[0].settlement_end_date}`);
            console.log(`  - Total cumulative: $${openSettlementAmount}`);
            console.log(`  - Already drawn: $${totalDrawn}`);
            console.log(`  - Volume data points: ${recentVolume?.length || 0}`);
            
            // Use the settlement dates to generate daily distributions
            const settlementStart = estimatedPayouts[0].raw_settlement_data?.settlement_start_date || estimatedPayouts[0].settlement_start_date;
            const settlementEnd = estimatedPayouts[0].raw_settlement_data?.settlement_end_date || estimatedPayouts[0].settlement_end_date;
            
            if (settlementStart && settlementEnd) {
              // Import distribution calculator
              const { generateCumulativeDailyDistribution } = await import('./forecast-amazon-payouts-math/daily-cumulative-distribution.ts');
              
              // Start distribution from tomorrow (or settlement start if later)
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const distributionStart = new Date(Math.max(tomorrow.getTime(), new Date(settlementStart).getTime()));
              
              const dailyDist = generateCumulativeDailyDistribution(
                distributionStart,
                new Date(settlementEnd),
                openSettlementAmount, // Total cumulative from Amazon
                totalDrawn,
                recentVolume || []
              );
              
              console.log(`  - Generated ${dailyDist.length} daily distribution entries starting from ${distributionStart.toISOString().split('T')[0]}`);
              
              // Create forecast entries for each day
              dailyDist.forEach(day => {
                forecastedPayouts.push({
                  user_id: userId,
                  account_id: amazonAccount.account_id,
                  amazon_account_id: amazonAccount.id,
                  payout_date: day.date,
                  total_amount: day.cumulative_available, // Cumulative amount
                  settlement_id: estimatedPayouts[0].settlement_id,
                  status: 'forecasted',
                  payout_type: 'daily',
                  currency_code: 'USD',
                  raw_settlement_data: {
                    forecast_metadata: {
                      method: 'cumulative_daily_distribution',
                      settlement_period: {
                        start: settlementStart,
                        end: settlementEnd
                      },
                      daily_unlock_amount: day.daily_unlock,
                      cumulative_available: day.cumulative_available,
                      days_accumulated: day.days_accumulated,
                      total_drawn_to_date: totalDrawn,
                      confidence: 95
                    }
                  }
                });
              });
            } else {
              console.log(`  - WARNING: Missing settlement dates, skipping daily distribution`);
            }
          }
        } else {
          // No open settlement, start from last confirmed payout or yesterday (whichever is later)
          // to ensure forecasts start from today
          const lastConfirmedDate = new Date(amazonPayouts[0].payout_date);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          // Use the more recent date (either last payout or yesterday)
          lastPayoutDate = lastConfirmedDate > yesterday ? lastConfirmedDate : yesterday;
          console.log(`[FORECAST] No open settlement found, starting from ${lastPayoutDate.toISOString().split('T')[0]} (last confirmed: ${amazonPayouts[0].payout_date})`);
        }
        
        // Calculate baseline amount from TRANSACTIONS (not payouts)
        let baselineAmount;
        
        if (!amazonTransactions || amazonTransactions.length === 0) {
          // Fallback: if no transaction data, use payout history
          console.log(`[FORECAST] No transaction data, falling back to payout history for ${amazonAccount.account_name}`);
          if (payoutFrequency === 'daily') {
            const oldestPayoutDate = new Date(amazonPayouts[amazonPayouts.length - 1].payout_date);
            const newestPayoutDate = new Date(amazonPayouts[0].payout_date);
            const daysDiff = Math.ceil((newestPayoutDate.getTime() - oldestPayoutDate.getTime()) / (1000 * 60 * 60 * 24));
            const totalPayoutAmount = nonForecastedPayouts.reduce((sum, p) => sum + Number(p.total_amount), 0);
            baselineAmount = daysDiff > 0 ? totalPayoutAmount / daysDiff : simpleAvg;
          } else {
            baselineAmount = avgPayoutAmount;
          }
        } else {
          // PRIMARY METHOD: Calculate from recent transactions
          console.log(`[FORECAST] Calculating baseline from ${amazonTransactions.length} recent transactions`);
          
          // Sum all recent transaction amounts (orders - fees - refunds)
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
          
          console.log(`[FORECAST] Transaction-based calculation for ${amazonAccount.account_name}:`, {
            totalOrders,
            totalFees,
            totalRefunds,
            netTransactionValue,
            transactionDays,
            dailyAverage,
            dateRange: `${oldestTxDate.toISOString().split('T')[0]} to ${newestTxDate.toISOString().split('T')[0]}`
          });
          
          if (payoutFrequency === 'daily') {
            baselineAmount = dailyAverage;
          } else {
            // For bi-weekly: multiply daily average by 14
            baselineAmount = dailyAverage * 14;
          }
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
          
          // Use baseline amount for calculations
          let basePrediction = baselineAmount;
          let calculationMethod = 'baseline';
          
          if (payoutFrequency === 'daily') {
            // For daily payouts: Add realistic day-to-day variation
            // Each day should have unique characteristics based on actual sales patterns
            
            // Use a combination of:
            // 1. Day of week pattern (weekdays vs weekends)
            // 2. Random variation to simulate natural fluctuations
            // 3. Sales trend if available
            
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
            
            // Day of week multiplier (weekends typically lower sales)
            let dayMultiplier = 1.0;
            if (dayOfWeek === 0) { // Sunday
              dayMultiplier = 0.75;
            } else if (dayOfWeek === 6) { // Saturday
              dayMultiplier = 0.85;
            } else if (dayOfWeek === 1) { // Monday (often higher)
              dayMultiplier = 1.05;
            }
            
            // Add significant random variation (80-120% of baseline)
            const randomVariation = 0.80 + (Math.random() * 0.40);
            
            // For first 14 days: incorporate recent sales trend
            if (dayCount <= 14 && last14DaysSales.length > 0) {
              const avgRecentSales = last14DaysSales.reduce((a, b) => a + b, 0) / last14DaysSales.length;
              const trendAdjustment = 1 + (recentSalesTrend / avgRecentSales) * dayCount * 0.1;
              basePrediction = baselineAmount * dayMultiplier * randomVariation * Math.max(0.5, Math.min(1.5, trendAdjustment));
              calculationMethod = 'daily_with_trend';
              
              if (dayCount === 1) {
                console.log(`[FORECAST] ${amazonAccount.account_name} - Daily forecast with trend:`, {
                  baseline: baselineAmount.toFixed(2),
                  dayOfWeek,
                  dayMultiplier,
                  randomVariation: randomVariation.toFixed(3),
                  trendAdjustment: trendAdjustment.toFixed(3)
                });
              }
            } else {
              // Days 15-90: use baseline with day-of-week and random variation
              basePrediction = baselineAmount * dayMultiplier * randomVariation;
              calculationMethod = 'daily_pattern';
            }
            
            if (dayCount === 1 || dayCount === 15 || dayCount === 30) {
              console.log(`[FORECAST] ${amazonAccount.account_name} - Day ${dayCount} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]}):`, {
                method: calculationMethod,
                dayMultiplier: dayMultiplier.toFixed(2),
                amount: basePrediction.toFixed(2)
              });
            }
          } else {
            // Bi-weekly: Add more significant variation between periods (85-115%)
            const periodVariation = 0.85 + (Math.random() * 0.30);
            basePrediction = baselineAmount * periodVariation;
            calculationMethod = 'biweekly_with_variation';
            
            console.log(`[FORECAST] ${amazonAccount.account_name} - Period ${dayCount}:`, {
              baseline: baselineAmount.toFixed(2),
              variation: periodVariation.toFixed(3),
              predicted: basePrediction.toFixed(2)
            });
          }
          
          // Apply seasonal adjustment based on historical month performance
          const forecastMonth = currentDate.getMonth() + 1; // 1-12
          const seasonalMultiplier = seasonalMultipliers[forecastMonth] || 1.0;
          const seasonallyAdjusted = basePrediction * seasonalMultiplier;
          
          if (dayCount <= 3 || dayCount % 14 === 0 || (payoutFrequency === 'bi-weekly')) {
            console.log(`[FORECAST] ${amazonAccount.account_name} - Month ${forecastMonth} seasonal adjustment: ${basePrediction.toFixed(2)} * ${seasonalMultiplier.toFixed(2)} = ${seasonallyAdjusted.toFixed(2)}`);
          }
          
          // Apply risk adjustment: -5 = +5%, 0 = no adjustment, 5 = -5%, 10 = -10%
          const riskMultiplier = 1 - (riskAdjustment / 100);
          const predictedAmount = Math.round(seasonallyAdjusted * riskMultiplier);
          
          if (dayCount <= 3 || dayCount % 14 === 0 || (payoutFrequency === 'bi-weekly')) {
            console.log(`[FORECAST] ${amazonAccount.account_name} - ${payoutFrequency === 'daily' ? 'Day' : 'Period'} ${dayCount} final: base ${basePrediction.toFixed(2)} → seasonal ${seasonallyAdjusted.toFixed(2)} → risk-adjusted ${predictedAmount}`);
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
            currency_code: amazonPayouts[0].currency_code || 'USD',
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
                upper_bound: Math.round(predictedAmount * 1.2),
                lower_bound: Math.round(predictedAmount * 0.8),
                period: payoutFrequency === 'daily' ? `Day ${dayCount}` : `Forecast ${biweeklyPeriodIndex + 1}`,
                generated_at: new Date().toISOString(),
                frequency: payoutFrequency,
                calculation_method: calculationMethod,
                baseline_amount: baselineAmount,
                demo_multiplier: 1,
                base_prediction: basePrediction,
                seasonal_multiplier: seasonalMultiplier,
                seasonally_adjusted: seasonallyAdjusted,
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
