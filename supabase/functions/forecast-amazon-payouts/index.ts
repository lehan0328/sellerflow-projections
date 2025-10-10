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
      .limit(1000);

    if (transactionsError) {
      console.error('[FORECAST] Error fetching transactions:', transactionsError);
    }

    console.log('[FORECAST] Data fetched', { 
      payoutCount: amazonPayouts?.length || 0,
      transactionCount: amazonTransactions?.length || 0
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
    
    console.log('[FORECAST] Starting forecast generation', { 
      payoutCount: amazonPayouts.length,
      monthlyDataPoints: historicalData.length 
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

    const analysisPrompt = `Analyze the following Amazon Seller payout data and generate accurate forecasts for the next 3 months.

HISTORICAL PAYOUT DATA (Most Recent ${Math.min(20, amazonPayouts.length)} entries):
${JSON.stringify(amazonPayouts.slice(0, 20), null, 2)}

AGGREGATED MONTHLY DATA (Last 6 Months):
${JSON.stringify(historicalData, null, 2)}

TOTAL HISTORICAL PAYOUTS: ${amazonPayouts.length}
DATE RANGE: ${amazonPayouts[amazonPayouts.length - 1]?.payout_date} to ${amazonPayouts[0]?.payout_date}

ANALYSIS REQUIREMENTS:

1. TREND ANALYSIS:
   - Calculate the overall growth trajectory
   - Identify any acceleration or deceleration patterns
   - Detect seasonal patterns and cycles
   - Assess momentum and velocity of change

2. STATISTICAL MODELING:
   - Apply appropriate time series forecasting methods
   - Calculate confidence intervals (80% and 95%)
   - Identify any anomalies or outliers
   - Assess data quality and forecasting reliability

3. BUSINESS CONTEXT:
   - Consider typical Amazon payout cycles (bi-weekly)
   - Account for marketplace dynamics
   - Factor in observed sales trends
   - Consider economic and seasonal factors

4. FORECAST GENERATION:
   Generate predictions for the next 6 bi-weekly payout periods (3 months) with:
   - Predicted payout amount
   - Confidence interval (upper and lower bounds)
   - Confidence level (0-1 scale)
   - Estimated payout date (use bi-weekly frequency from last payout date)
   - Period identifier (e.g., "Period 1", "Period 2")

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
      const forecastedPayouts = forecast.predictions.map((pred: any, index: number) => {
        // Calculate estimated payout date (bi-weekly from most recent payout)
        const lastPayoutDate = new Date(amazonPayouts[0].payout_date);
        const estimatedDate = new Date(lastPayoutDate);
        estimatedDate.setDate(estimatedDate.getDate() + (14 * (index + 1))); // Bi-weekly
        
        return {
          user_id: userId,
          amazon_account_id: amazonPayouts[0].amazon_account_id,
          payout_date: estimatedDate.toISOString().split('T')[0],
          total_amount: pred.predicted_amount || pred.amount,
          settlement_id: `forecast-${Date.now()}-${index}`,
          marketplace_name: amazonPayouts[0].marketplace_name || 'Amazon',
          status: 'forecasted',
          payout_type: 'bi-weekly',
          currency_code: amazonPayouts[0].currency_code || 'USD',
          transaction_count: 0,
          raw_settlement_data: {
            forecast_metadata: {
              confidence: pred.confidence,
              upper_bound: pred.upper_bound,
              lower_bound: pred.lower_bound,
              period: pred.period,
              generated_at: new Date().toISOString()
            }
          }
        };
      });

      // Delete existing forecasted payouts for this user
      await supabase
        .from('amazon_payouts')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'forecasted');

      // Insert new forecasted payouts
      const { error: insertError } = await supabase
        .from('amazon_payouts')
        .insert(forecastedPayouts);

      if (insertError) {
        console.error('[FORECAST] Error storing forecasted payouts:', insertError);
      } else {
        console.log('[FORECAST] Stored', forecastedPayouts.length, 'forecasted payouts');
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
