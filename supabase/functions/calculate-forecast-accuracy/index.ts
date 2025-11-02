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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    console.log('[ACCURACY] Calculating forecast accuracy for user:', user.id);

    // Get user's account_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.account_id) {
      throw new Error('User profile not found');
    }

    // Fetch all payouts that replaced forecasts (have accuracy data)
    const { data: replacedForecasts, error: fetchError } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('account_id', profile.account_id)
      .not('forecast_replaced_at', 'is', null)
      .not('original_forecast_amount', 'is', null)
      .order('payout_date', { ascending: false });

    if (fetchError) {
      console.error('[ACCURACY] Error fetching replaced forecasts:', fetchError);
      throw fetchError;
    }

    if (!replacedForecasts || replacedForecasts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No forecast comparisons available yet',
          metrics: {
            totalComparisons: 0,
            overallAccuracy: 0,
            averageError: 0,
            trends: []
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ACCURACY] Found ${replacedForecasts.length} replaced forecasts`);

    // Exclude outliers using IQR method
    const absolutePercentageErrors = replacedForecasts.map(p => {
      const forecast = Number(p.original_forecast_amount || 0);
      const actual = Number(p.total_amount || 0);
      if (actual === 0) return 0;
      return Math.abs((actual - forecast) / actual) * 100;
    });

    // Sort to calculate quartiles
    const sortedErrors = [...absolutePercentageErrors].sort((a, b) => a - b);
    const q1Index = Math.floor(sortedErrors.length * 0.25);
    const q3Index = Math.floor(sortedErrors.length * 0.75);
    const q1 = sortedErrors[q1Index];
    const q3 = sortedErrors[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Filter out outliers
    const filteredForecasts = replacedForecasts.filter((p, idx) => {
      const error = absolutePercentageErrors[idx];
      return error >= lowerBound && error <= upperBound;
    });

    const outlierCount = replacedForecasts.length - filteredForecasts.length;
    console.log(`[ACCURACY] Excluded ${outlierCount} outliers. Using ${filteredForecasts.length} forecasts for metrics.`);

    // If too few forecasts remain after filtering, use all forecasts
    const dataForMetrics = filteredForecasts.length >= 3 ? filteredForecasts : replacedForecasts;
    const actualOutlierCount = filteredForecasts.length >= 3 ? outlierCount : 0;
    
    if (filteredForecasts.length < 3 && replacedForecasts.length >= 3) {
      console.log(`[ACCURACY] Using all ${replacedForecasts.length} forecasts (insufficient data after outlier removal)`);
    }

    // Calculate comprehensive metrics using filtered data
    const accuracies = dataForMetrics.map(p => p.forecast_accuracy_percentage || 0);
    const overallAccuracy = accuracies.length > 0 
      ? accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length 
      : 0;

    // Calculate absolute errors using filtered data
    const absoluteErrors = dataForMetrics.map(p => {
      const forecast = Number(p.original_forecast_amount || 0);
      const actual = Number(p.total_amount || 0);
      return Math.abs(actual - forecast);
    });
    const averageAbsoluteError = absoluteErrors.length > 0
      ? absoluteErrors.reduce((sum, e) => sum + e, 0) / absoluteErrors.length
      : 0;

    // Calculate percentage errors (MAPE - Mean Absolute Percentage Error) using filtered data
    const percentageErrors = dataForMetrics.map(p => {
      const forecast = Number(p.original_forecast_amount || 0);
      const actual = Number(p.total_amount || 0);
      if (actual === 0) return 0;
      return Math.abs((actual - forecast) / actual) * 100;
    });
    const mape = percentageErrors.length > 0
      ? percentageErrors.reduce((sum, e) => sum + e, 0) / percentageErrors.length
      : 0;

    // Bias analysis using filtered data (are we consistently over or under-forecasting?)
    const biases = dataForMetrics.map(p => {
      const forecast = Number(p.original_forecast_amount || 0);
      const actual = Number(p.total_amount || 0);
      return forecast - actual; // Positive = over-forecast, Negative = under-forecast
    });
    const averageBias = biases.length > 0
      ? biases.reduce((sum, b) => sum + b, 0) / biases.length
      : 0;
    const avgActual = dataForMetrics.length > 0
      ? dataForMetrics.reduce((sum, p) => sum + Number(p.total_amount || 0), 0) / dataForMetrics.length
      : 0;
    const biasPercentage = avgActual > 0
      ? (averageBias / avgActual) * 100
      : 0;

    // Accuracy by modeling method using filtered data
    const byMethod: Record<string, { count: number; totalAccuracy: number; avgAccuracy: number }> = {};
    dataForMetrics.forEach(p => {
      const method = p.modeling_method || 'unknown';
      if (!byMethod[method]) {
        byMethod[method] = { count: 0, totalAccuracy: 0, avgAccuracy: 0 };
      }
      byMethod[method].count++;
      byMethod[method].totalAccuracy += p.forecast_accuracy_percentage || 0;
    });

    Object.keys(byMethod).forEach(method => {
      byMethod[method].avgAccuracy = byMethod[method].totalAccuracy / byMethod[method].count;
    });

    // Monthly accuracy trends using filtered data
    const monthlyTrends: Record<string, { count: number; totalAccuracy: number; avgAccuracy: number }> = {};
    dataForMetrics.forEach(p => {
      const month = p.payout_date.substring(0, 7); // YYYY-MM
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = { count: 0, totalAccuracy: 0, avgAccuracy: 0 };
      }
      monthlyTrends[month].count++;
      monthlyTrends[month].totalAccuracy += p.forecast_accuracy_percentage || 0;
    });

    Object.keys(monthlyTrends).forEach(month => {
      monthlyTrends[month].avgAccuracy = monthlyTrends[month].totalAccuracy / monthlyTrends[month].count;
    });

    const trends = Object.entries(monthlyTrends)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        accuracy: data.avgAccuracy,
        count: data.count
      }));

    // Calculate improvement rate using filtered data (comparing first half vs second half)
    const halfPoint = Math.floor(dataForMetrics.length / 2);
    const firstHalfAccuracy = dataForMetrics
      .slice(halfPoint)
      .reduce((sum, p) => sum + (p.forecast_accuracy_percentage || 0), 0) / Math.max(1, dataForMetrics.length - halfPoint);
    const secondHalfAccuracy = dataForMetrics
      .slice(0, halfPoint)
      .reduce((sum, p) => sum + (p.forecast_accuracy_percentage || 0), 0) / Math.max(1, halfPoint);
    const improvementRate = firstHalfAccuracy > 0 
      ? ((secondHalfAccuracy - firstHalfAccuracy) / firstHalfAccuracy) * 100
      : 0;

    // Generate insights based on the data
    const insights: string[] = [];

    if (overallAccuracy >= 90) {
      insights.push('🎯 Excellent! Your forecasts are highly accurate (90%+).');
    } else if (overallAccuracy >= 80) {
      insights.push('✅ Good accuracy! Your forecasts are reliable (80-90%).');
    } else if (overallAccuracy >= 70) {
      insights.push('⚠️ Moderate accuracy. Consider adjusting risk settings or providing more historical data.');
    } else {
      insights.push('❌ Low accuracy. Forecasts need more historical data or adjusted parameters.');
    }

    if (Math.abs(biasPercentage) > 10) {
      if (biasPercentage > 0) {
        insights.push(`📉 Consistent over-forecasting by ${Math.abs(biasPercentage).toFixed(1)}%. Consider using a more conservative risk adjustment.`);
      } else {
        insights.push(`📈 Consistent under-forecasting by ${Math.abs(biasPercentage).toFixed(1)}%. Consider using a more aggressive risk adjustment.`);
      }
    } else {
      insights.push('✓ Well-balanced forecasts with minimal systematic bias.');
    }

    if (improvementRate > 5) {
      insights.push(`📊 Accuracy is improving over time (+${improvementRate.toFixed(1)}%).`);
    } else if (improvementRate < -5) {
      insights.push(`📉 Accuracy declining over time (${improvementRate.toFixed(1)}%). May need model recalibration.`);
    }

    if (mape < 10) {
      insights.push('💡 Low average error rate (<10% MAPE). Forecasts are very precise.');
    } else if (mape > 20) {
      insights.push('💡 High variability in forecasts (>20% MAPE). More data may improve precision.');
    }

    const metrics = {
      totalComparisons: dataForMetrics.length,
      outliersExcluded: actualOutlierCount,
      overallAccuracy: parseFloat(overallAccuracy.toFixed(2)),
      averageAbsoluteError: parseFloat(averageAbsoluteError.toFixed(2)),
      mape: parseFloat(mape.toFixed(2)),
      averageBias: parseFloat(averageBias.toFixed(2)),
      biasPercentage: parseFloat(biasPercentage.toFixed(2)),
      improvementRate: parseFloat(improvementRate.toFixed(2)),
      byMethod,
      trends,
      insights,
      recentComparisons: dataForMetrics.slice(0, 5).map(p => ({
        date: p.payout_date,
        forecast: Number(p.original_forecast_amount),
        actual: Number(p.total_amount),
        accuracy: p.forecast_accuracy_percentage,
        method: p.modeling_method
      }))
    };

    console.log('[ACCURACY] Calculated metrics:', metrics);

    return new Response(
      JSON.stringify({
        success: true,
        metrics
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ACCURACY] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
