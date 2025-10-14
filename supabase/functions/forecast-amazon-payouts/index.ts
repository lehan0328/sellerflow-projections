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

    // Delete all existing forecasted payouts for this user before generating new ones
    await supabase
      .from('amazon_payouts')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'forecasted');

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const allForecasts: any[] = [];

    // Generate forecasts for each Amazon account
    for (const amazonAccount of amazonAccounts) {
      console.log(`\n[FORECAST] Processing account: ${amazonAccount.account_name} (${amazonAccount.marketplace_name})`);
      console.log(`[FORECAST] Account ID: ${amazonAccount.id}`);
      
      // Fetch Amazon payouts for this specific account from last 3 months
      const { data: amazonPayouts, error: payoutsError } = await supabase
        .from('amazon_payouts')
        .select('*')
        .eq('amazon_account_id', amazonAccount.id)
        .eq('status', 'confirmed') // Only use confirmed payouts for baseline
        .gte('payout_date', threeMonthsAgo.toISOString().split('T')[0])
        .order('payout_date', { ascending: false });

      if (payoutsError) {
        console.error(`[FORECAST] Error fetching payouts for account ${amazonAccount.id}:`, payoutsError);
        continue; // Skip this account and continue with next one
      }

      if (!amazonPayouts || amazonPayouts.length === 0) {
        console.log(`[FORECAST] No historical payouts found for account ${amazonAccount.account_name}, skipping forecast generation`);
        continue;
      }

      // Fetch Amazon transactions for this specific account from last 3 months
      const { data: amazonTransactions, error: transactionsError } = await supabase
        .from('amazon_transactions')
        .select('*')
        .eq('amazon_account_id', amazonAccount.id)
        .gte('transaction_date', threeMonthsAgo.toISOString())
        .order('transaction_date', { ascending: false })
        .limit(1000);

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

      // All transactions are already from last 3 months
      const recentTransactions = amazonTransactions || [];

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

      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      // Prepare a simplified data analysis prompt
      const systemPrompt = `You are a financial analyst specializing in Amazon marketplace forecasting. Analyze payout data and provide accurate predictions.`;

      const analysisPrompt = `Analyze Amazon Seller data from LAST 3 MONTHS ONLY and forecast next 3 months (6 bi-weekly periods) for ${amazonAccount.account_name} (${amazonAccount.marketplace_name}).

RECENT SALES TRENDS (Last 3 Months):
Monthly Order Volume: ${JSON.stringify(Object.values(monthlyTransactions).map((m: any) => ({
  month: m.month,
  orders_amount: m.orders_amount,
  net_amount: m.net_amount,
  transaction_count: m.transaction_count
})), null, 2)}

RECENT PAYOUTS (Last 3 Months):
${JSON.stringify(amazonPayouts.map(p => ({
  date: p.payout_date,
  amount: p.total_amount
})), null, 2)}

3-Month Average Payout: $${avgPayoutAmount.toFixed(2)}

IMPORTANT: Amazon payout forecasts are highly predictable based on historical data.
User's Risk Adjustment: ${riskAdjustment}% (-5=Aggressive+5%, 0=Medium, 5=Safe-5%, 10=Very Safe-10%)

Analyze sales velocity trends, growth patterns, and provide 6 forecasted payout amounts.
Note: The system will apply the user's risk adjustment AFTER your predictions, so predict based on actual trends.

Return ONLY this JSON (no markdown):
{
  "analysis": "Brief trend analysis based on last 3 months (2-3 sentences)",
  "sales_trend": "increasing/decreasing/stable",
  "predictions": [
    {
      "period": "Period 1",
      "predicted_amount": number,
      "confidence": 0.90,
      "reasoning": "brief reason emphasizing data reliability"
    }
  ],
  "buying_opportunity": {
    "recommended_amount": number,
    "timing": "specific date recommendation",
    "confidence": 0.92
  }
}`;

      console.log(`[FORECAST] Calling Lovable AI for analysis of ${amazonAccount.account_name}...`);

      // Set timeout for AI call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

      let aiResponse;
      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash', // Using flash model for faster response
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: analysisPrompt }
            ],
            temperature: 0.3,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[FORECAST] AI API error for ${amazonAccount.account_name}:`, response.status, errorText);
          
          if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again in a moment.');
          }
          if (response.status === 402) {
            throw new Error('AI service requires payment. Please add credits to continue.');
          }
          throw new Error(`AI service error: ${response.status}`);
        }

        const aiData = await response.json();
        aiResponse = aiData.choices?.[0]?.message?.content;

        if (!aiResponse) {
          throw new Error('No response from AI service');
        }

        console.log(`[FORECAST] AI response received for ${amazonAccount.account_name}, parsing...`);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error(`[FORECAST] AI request timed out for ${amazonAccount.account_name}`);
          continue; // Skip this account
        }
        console.error(`[FORECAST] Error for ${amazonAccount.account_name}:`, fetchError);
        continue; // Skip this account
      }

      // Try to extract JSON from the response
      let forecast;
      try {
        // Look for JSON block in markdown code blocks
        const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || 
                         aiResponse.match(/```\n([\s\S]*?)\n```/) ||
                         [null, aiResponse];
        
        const jsonString = jsonMatch[1] || aiResponse;
        forecast = JSON.parse(jsonString.trim());
      } catch (parseError) {
        console.error(`[FORECAST] Failed to parse AI response as JSON for ${amazonAccount.account_name}:`, parseError);
        // Continue to next account
        continue;
      }

      console.log(`[FORECAST] Forecast generated successfully for ${amazonAccount.account_name}`);

      // Store forecasted payouts in the database
      if (forecast.predictions && Array.isArray(forecast.predictions)) {
        const payoutFrequency = amazonAccount.payout_frequency || 'bi-weekly';
        const lastPayoutDate = new Date(amazonPayouts[0].payout_date);
        
        // Calculate baseline amount based on frequency
        let baselineAmount;
        if (payoutFrequency === 'daily') {
          // For daily: calculate average payout per day from historical data
          // Formula: total payout over set days / # of days for those payouts = payout per day
          const oldestPayoutDate = new Date(amazonPayouts[amazonPayouts.length - 1].payout_date);
          const newestPayoutDate = new Date(amazonPayouts[0].payout_date);
          const daysDiff = Math.ceil((newestPayoutDate.getTime() - oldestPayoutDate.getTime()) / (1000 * 60 * 60 * 24));
          const totalPayoutAmount = nonForecastedPayouts.reduce((sum, p) => sum + Number(p.total_amount), 0);
          baselineAmount = daysDiff > 0 ? totalPayoutAmount / daysDiff : simpleAvg;
          
          console.log(`[FORECAST] Daily payout calculation for ${amazonAccount.account_name}:`, {
            totalPayoutAmount,
            daysDiff,
            averagePerDay: baselineAmount,
            dateRange: `${oldestPayoutDate.toISOString().split('T')[0]} to ${newestPayoutDate.toISOString().split('T')[0]}`
          });
        } else {
          // For bi-weekly: use weighted average
          baselineAmount = avgPayoutAmount;
        }
        
        // Generate forecasts for 3 months based on frequency
        const forecastedPayouts: any[] = [];
        const threeMonthsOut = new Date(lastPayoutDate);
        threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);
        
        let currentDate = new Date(lastPayoutDate);
        let biweeklyPeriodIndex = 0;
        let dayCount = 0;
        
        // For daily: generate 90 daily payouts (3 months)
        // For bi-weekly: generate 6 bi-weekly payouts (3 months)
        const maxForecasts = payoutFrequency === 'daily' ? 90 : 6;
        
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
          
          // Use baseline amount for daily (already calculated per day)
          // For bi-weekly, use AI predictions if available
          let basePrediction = baselineAmount;
          let calculationMethod = 'baseline';
          
          if (payoutFrequency === 'bi-weekly' && forecast.predictions && forecast.predictions[biweeklyPeriodIndex]) {
            const aiPrediction = forecast.predictions[biweeklyPeriodIndex].predicted_amount || baselineAmount;
            basePrediction = aiPrediction;
            calculationMethod = 'ai_prediction';
            
            console.log(`[FORECAST] ${amazonAccount.account_name} - Period ${biweeklyPeriodIndex + 1} AI prediction: ${aiPrediction}`);
          } else if (payoutFrequency === 'daily') {
            // For first 14 days: use recent sales trend if available
            if (dayCount <= 14 && last14DaysSales.length > 0) {
              // Project sales forward based on recent trend
              const avgRecentSales = last14DaysSales.reduce((a, b) => a + b, 0) / last14DaysSales.length;
              const projectedSales = avgRecentSales + (recentSalesTrend * dayCount);
              
              // Payout is typically ~90% of sales (after fees)
              basePrediction = projectedSales * 0.90;
              calculationMethod = 'recent_sales_trend';
              
              if (dayCount === 1) {
                console.log(`[FORECAST] ${amazonAccount.account_name} - Using recent sales trend for first 14 days:`, {
                  avgRecentSales: avgRecentSales.toFixed(2),
                  dailyTrend: recentSalesTrend.toFixed(2),
                  payoutMultiplier: 0.90
                });
              }
            } else {
              // Days 15-90: use historical daily average with variation for realism
              const variation = 0.92 + (Math.random() * 0.16); // 92-108% variation
              basePrediction = baselineAmount * variation;
              calculationMethod = 'historical_avg_with_variation';
            }
            
            if (dayCount === 1 || dayCount === 15) {
              console.log(`[FORECAST] ${amazonAccount.account_name} - Day ${dayCount} prediction method: ${calculationMethod}, amount: ${basePrediction.toFixed(2)}`);
            }
          } else {
            // Add 5-10% variation for realism on bi-weekly
            const variation = 0.95 + (Math.random() * 0.15);
            basePrediction = baselineAmount * variation;
            calculationMethod = 'baseline_with_variation';
          }
          
          // Apply risk adjustment: -5 = +5%, 0 = no adjustment, 5 = -5%, 10 = -10%
          const riskMultiplier = 1 - (riskAdjustment / 100);
          const predictedAmount = Math.round(basePrediction * riskMultiplier);
          
          if (dayCount <= 3 || dayCount % 14 === 0 || (payoutFrequency === 'bi-weekly')) {
            console.log(`[FORECAST] ${amazonAccount.account_name} - ${payoutFrequency === 'daily' ? 'Day' : 'Period'} ${dayCount} after ${riskAdjustment}% risk adjustment: ${basePrediction.toFixed(2)} * ${riskMultiplier.toFixed(2)} = ${predictedAmount}`);
          }
          
          const forecastPayout = {
            user_id: userId,
            account_id: accountId,
            amazon_account_id: amazonAccount.id,
            payout_date: currentDate.toISOString().split('T')[0],
            total_amount: Math.round(predictedAmount),
            settlement_id: `forecast-${Date.now()}-${amazonAccount.id}-${dayCount}`,
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
                confidence: forecast.predictions?.[biweeklyPeriodIndex]?.confidence || 0.90,
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
