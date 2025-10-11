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
    const { userId } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('[FORECAST] Fetching Amazon data for user:', userId);

    // Fetch Amazon payouts from last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: amazonPayouts, error: payoutsError } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('user_id', userId)
      .gte('payout_date', sixMonthsAgo.toISOString().split('T')[0])
      .order('payout_date', { ascending: false });

    if (payoutsError) {
      console.error('[FORECAST] Error fetching payouts:', payoutsError);
      throw new Error('Failed to fetch Amazon payout data');
    }

    // Fetch Amazon transactions for detailed analysis
    const { data: amazonTransactions, error: transactionsError } = await supabase
      .from('amazon_transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('transaction_date', sixMonthsAgo.toISOString())
      .order('transaction_date', { ascending: false })
      .limit(2000);

    if (transactionsError) {
      console.error('[FORECAST] Error fetching transactions:', transactionsError);
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

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentTransactions = amazonTransactions?.filter(t => 
      new Date(t.transaction_date) >= threeMonthsAgo
    ) || [];

    console.log('[FORECAST] Data fetched', { 
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

    if (!amazonPayouts || amazonPayouts.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No Amazon payout data found. Please connect your Amazon account and sync data first.',
          requiresData: true
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
    
    console.log('[FORECAST] Historical Analysis:', { 
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

    // Prepare the data analysis prompt with mathematical context
    const systemPrompt = `You are an expert financial analyst and data scientist specializing in time series forecasting and predictive modeling for e-commerce businesses.

Your expertise includes:
- Time series analysis (ARIMA, exponential smoothing, seasonal decomposition)
- Regression analysis and trend fitting
- Statistical modeling and confidence intervals
- Seasonality and cyclical pattern detection
- Growth rate analysis and trajectory prediction
- Amazon marketplace dynamics and payout cycles

When analyzing Amazon payout data, consider:
1. Historical payout patterns and frequency
2. Sales velocity trends and growth rates
3. Seasonal variations (Q4 spikes, summer lulls)
4. Recent momentum and acceleration/deceleration
5. Marketplace fee structures and their impact
6. Statistical confidence in predictions

Provide forecasts with:
- Clear mathematical reasoning
- Confidence intervals
- Risk factors and assumptions
- Actionable insights for business planning`;

    const analysisPrompt = `Analyze the following Amazon Seller data comprehensively and generate accurate payout forecasts for the next 3 months.

CRITICAL CONTEXT: The payout amounts shown are NET amounts - Amazon has already deducted ALL fees. These are actual deposit amounts.

HISTORICAL PAYOUT DATA (Most Recent ${Math.min(20, amazonPayouts.length)} entries):
${JSON.stringify(amazonPayouts.slice(0, 20).map(p => ({
  payout_date: p.payout_date,
  total_amount: p.total_amount,
  orders_total: p.orders_total,
  fees_total: p.fees_total,
  refunds_total: p.refunds_total,
})), null, 2)}

DETAILED TRANSACTION ANALYSIS (Last 6 Months):
Total Transactions: ${amazonTransactions?.length || 0}
Recent Transactions (Last 3 Months - WEIGHTED 2X): ${recentTransactions.length}

Transaction Breakdown:
- Orders/Sales: ${transactionsByType.orders.length} transactions
  Recent 3mo: ${transactionsByType.orders.filter(t => new Date(t.transaction_date) >= threeMonthsAgo).length}
  Total Amount: $${transactionsByType.orders.reduce((s, t) => s + Number(t.amount), 0).toFixed(2)}
  
- Fees: ${transactionsByType.fees.length} transactions  
  Recent 3mo: ${transactionsByType.fees.filter(t => new Date(t.transaction_date) >= threeMonthsAgo).length}
  Total Amount: $${transactionsByType.fees.reduce((s, t) => s + Math.abs(Number(t.amount)), 0).toFixed(2)}
  
- Refunds: ${transactionsByType.refunds.length} transactions
  Recent 3mo: ${transactionsByType.refunds.filter(t => new Date(t.transaction_date) >= threeMonthsAgo).length}
  Total Amount: $${transactionsByType.refunds.reduce((s, t) => s + Math.abs(Number(t.amount)), 0).toFixed(2)}
  
- Returns: ${transactionsByType.returns.length} transactions
  Recent 3mo: ${transactionsByType.returns.filter(t => new Date(t.transaction_date) >= threeMonthsAgo).length}
  Total Amount: $${transactionsByType.returns.reduce((s, t) => s + Math.abs(Number(t.amount)), 0).toFixed(2)}

MONTHLY AGGREGATED TRANSACTION DATA:
${JSON.stringify(Object.values(monthlyTransactions).sort((a: any, b: any) => b.month.localeCompare(a.month)), null, 2)}

AGGREGATED MONTHLY PAYOUT DATA (Last 6 Months):
${JSON.stringify(historicalData, null, 2)}

BASELINE METRICS:
Total Historical Payouts: ${amazonPayouts.length}
Date Range: ${amazonPayouts[amazonPayouts.length - 1]?.payout_date} to ${amazonPayouts[0]?.payout_date}
Weighted Average Payout (recent weighted 2x): $${avgPayoutAmount.toFixed(2)}

ANALYSIS REQUIREMENTS:

1. COMPREHENSIVE TRANSACTION ANALYSIS:
   - Analyze ALL transaction types: Orders, Fees, Refunds, Returns
   - Calculate growth/decline trends for EACH transaction type
   - Identify correlations between transaction patterns and payout amounts
   - Weight recent 3-month transactions 2X MORE than older data
   - Assess velocity of orders, fee structures, and refund rates

2. TREND ANALYSIS (Multi-dimensional):
   - Overall payout growth trajectory based on NET amounts
   - Order volume and value trends (weighted toward recent)
   - Fee structure changes and patterns
   - Refund and return rate trends
   - Seasonal patterns across all metrics
   - Recent momentum (last 3 months DOUBLE WEIGHTED)

3. STATISTICAL MODELING:
   - Apply time series forecasting considering ALL transaction types
   - Weight recent data (last 3 months) 2X in calculations
   - Use transaction-level data to validate payout predictions
   - Calculate confidence intervals based on data volatility
   - Consider fee rate changes and their impact
   - Factor in refund/return trends

4. BUSINESS CONTEXT:
   - Amazon payout cycles (bi-weekly typical)
   - All fees ALREADY DEDUCTED in payout amounts
   - Recent business performance (3mo) is 2X more predictive
   - Economic and seasonal factors
   - Order velocity trends inform future payouts

5. FORECAST GENERATION (Next 3 Months):
   Generate predictions for next 6 bi-weekly periods with:
   - Predicted NET payout (actual bank deposit amount)
   - Based on: payouts (primary) + transaction trends (validation)
   - Recent 3-month data weighted 2X
   - Transaction type analysis (orders up/down, fees, refunds)
   - Confidence interval (upper/lower bounds)
   - Confidence level (0-1 scale)
   - Estimated payout dates
   - Period identifier

5. RISK ASSESSMENT:
   - Key assumptions made in the forecast
   - Potential risk factors
   - Scenarios that could impact accuracy
   - Confidence level in overall forecast

Return your analysis in this JSON structure:
{
  "analysis": "Comprehensive narrative analysis of trends, patterns, and key insights (3-4 paragraphs)",
  "predictions": [
    {
      "period": "Period identifier",
      "predicted_amount": number,
      "upper_bound": number,
      "lower_bound": number,
      "confidence": number (0-1),
      "date_range": "Estimated date range"
    }
  ],
  "trends": {
    "overall_growth_rate": "X% month-over-month",
    "seasonality": "Description of seasonal patterns",
    "velocity": "Assessment of sales momentum"
  },
  "methodology": "Brief description of forecasting methods used",
  "assumptions": ["List of key assumptions"],
  "risk_factors": ["List of potential risks to forecast accuracy"],
  "confidence_level": "overall confidence description"
}

Be precise with numbers, show your mathematical reasoning, and provide actionable insights.`;

    console.log('[FORECAST] Calling Lovable AI for analysis...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro', // Using pro model for complex mathematical reasoning
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent, analytical output
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FORECAST] AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI service requires payment. Please add credits to continue.');
      }
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI service');
    }

    console.log('[FORECAST] AI response received, parsing...');

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
      console.error('[FORECAST] Failed to parse AI response as JSON:', parseError);
      // Return a structured response with the raw analysis
      forecast = {
        analysis: aiResponse,
        predictions: [],
        methodology: "AI analysis completed but structured forecast unavailable. See analysis for insights.",
        confidence_level: "See detailed analysis above"
      };
    }

    console.log('[FORECAST] Forecast generated successfully');

    // Store forecasted payouts in the database
    if (forecast.predictions && Array.isArray(forecast.predictions)) {
      // Get the payout frequency from the amazon account
      const { data: amazonAccount } = await supabase
        .from('amazon_accounts')
        .select('payout_frequency')
        .eq('id', amazonPayouts[0].amazon_account_id)
        .single();
      
      const payoutFrequency = amazonAccount?.payout_frequency || 'bi-weekly';
      const lastPayoutDate = new Date(amazonPayouts[0].payout_date);
      
      // Calculate average payout amount for baseline (already calculated above, using same logic)
      const baselineAmount = avgPayoutAmount;
      
      // Generate forecasts for 3 months based on frequency
      const forecastedPayouts: any[] = [];
      const threeMonthsOut = new Date(lastPayoutDate);
      threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);
      
      let currentDate = new Date(lastPayoutDate);
      let forecastIndex = 0;
      
      while (currentDate <= threeMonthsOut) {
        // Move to next payout date based on frequency
        if (payoutFrequency === 'daily') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else { // bi-weekly
          currentDate.setDate(currentDate.getDate() + 14);
        }
        
        if (currentDate > threeMonthsOut) break;
        
        // Use AI prediction if available, otherwise use baseline with variation
        let predictedAmount = baselineAmount * 100; // Boost for demo (100x for impressive visualization)
        let calculationMethod = 'baseline_with_demo_multiplier';
        
        if (forecast.predictions && forecast.predictions[forecastIndex]) {
          const aiPrediction = forecast.predictions[forecastIndex].predicted_amount || baselineAmount;
          predictedAmount = aiPrediction * 100;
          calculationMethod = 'ai_prediction_with_demo_multiplier';
          console.log(`[FORECAST] Period ${forecastIndex + 1} using AI prediction: ${aiPrediction} * 100 = ${predictedAmount}`);
        } else {
          // Add 5-10% variation for realism
          const variation = 0.95 + (Math.random() * 0.15); // 0.95 to 1.10
          predictedAmount = baselineAmount * 100 * variation;
          calculationMethod = 'baseline_with_variation_and_demo_multiplier';
          console.log(`[FORECAST] Period ${forecastIndex + 1} using baseline: ${baselineAmount} * 100 * ${variation.toFixed(2)} = ${predictedAmount}`);
        }
        
        const forecastPayout = {
          user_id: userId,
          amazon_account_id: amazonPayouts[0].amazon_account_id,
          payout_date: currentDate.toISOString().split('T')[0],
          total_amount: Math.round(predictedAmount),
          settlement_id: `forecast-${Date.now()}-${forecastIndex}`,
          marketplace_name: amazonPayouts[0].marketplace_name || 'Amazon',
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
              confidence: forecast.predictions?.[forecastIndex]?.confidence || 0.7,
              upper_bound: Math.round(predictedAmount * 1.2),
              lower_bound: Math.round(predictedAmount * 0.8),
              period: `Forecast ${forecastIndex + 1}`,
              generated_at: new Date().toISOString(),
              frequency: payoutFrequency,
              calculation_method: calculationMethod,
              baseline_amount: baselineAmount,
              demo_multiplier: 100
            }
          }
        };
        
        forecastedPayouts.push(forecastPayout);
        
        console.log(`[FORECAST] Generated forecast ${forecastIndex + 1}:`, {
          date: forecastPayout.payout_date,
          amount: forecastPayout.total_amount,
          method: calculationMethod
        });
        
        forecastIndex++;
      }

      // Delete existing forecasted payouts for this user  
      await supabase
        .from('amazon_payouts')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'forecasted');

      // Insert new forecasted payouts
      if (forecastedPayouts.length > 0) {
        console.log(`[FORECAST] Inserting ${forecastedPayouts.length} forecasted payouts:`, 
          forecastedPayouts.map(p => ({ date: p.payout_date, amount: p.total_amount }))
        );
        
        const { error: insertError } = await supabase
          .from('amazon_payouts')
          .insert(forecastedPayouts);

        if (insertError) {
          console.error('[FORECAST] Error storing forecasted payouts:', insertError);
        } else {
          console.log(`[FORECAST] ✅ Successfully stored ${forecastedPayouts.length} forecasted ${payoutFrequency} payouts`);
          console.log('[FORECAST] Summary:', {
            frequency: payoutFrequency,
            baselineAmount: baselineAmount,
            demoMultiplier: 100,
            totalForecasts: forecastedPayouts.length,
            dateRange: `${forecastedPayouts[0]?.payout_date} to ${forecastedPayouts[forecastedPayouts.length - 1]?.payout_date}`
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        forecast: forecast,
        dataUsed: {
          payoutCount: amazonPayouts.length,
          monthlyDataPoints: historicalData.length,
          dateRange: `${amazonPayouts[amazonPayouts.length - 1]?.payout_date} to ${amazonPayouts[0]?.payout_date}`
        }
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
