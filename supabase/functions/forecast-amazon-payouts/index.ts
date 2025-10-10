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
    const { userId, historicalPayouts, historicalData } = await req.json();
    
    console.log('[FORECAST] Starting forecast generation', { 
      userId, 
      payoutCount: historicalPayouts?.length,
      dataPoints: historicalData?.length 
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

    const analysisPrompt = `Analyze the following Amazon Seller payout data and generate accurate forecasts for the next 3-6 months.

HISTORICAL PAYOUT DATA (Most Recent):
${JSON.stringify(historicalPayouts.slice(0, 20), null, 2)}

AGGREGATED MONTHLY DATA (Last 6 Months):
${JSON.stringify(historicalData, null, 2)}

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
   Generate predictions for the next 6 payout periods with:
   - Predicted payout amount
   - Confidence interval (upper and lower bounds)
   - Confidence level (0-1 scale)
   - Period identifier (e.g., "Week 1", "Week 2")

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

    return new Response(
      JSON.stringify({ 
        success: true,
        forecast: forecast
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
