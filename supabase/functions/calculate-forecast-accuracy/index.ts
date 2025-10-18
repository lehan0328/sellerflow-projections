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

    // Calculate comprehensive metrics
    const accuracies = replacedForecasts.map(p => p.forecast_accuracy_percentage || 0);
    const overallAccuracy = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;

    // Calculate absolute errors
    const absoluteErrors = replacedForecasts.map(p => {
      const forecast = Number(p.original_forecast_amount || 0);
      const actual = Number(p.total_amount || 0);
      return Math.abs(actual - forecast);
    });
    const averageAbsoluteError = absoluteErrors.reduce((sum, e) => sum + e, 0) / absoluteErrors.length;

    // Calculate percentage errors (MAPE - Mean Absolute Percentage Error)
    const percentageErrors = replacedForecasts.map(p => {
      const forecast = Number(p.original_forecast_amount || 0);
      const actual = Number(p.total_amount || 0);
      if (actual === 0) return 0;
      return Math.abs((actual - forecast) / actual) * 100;
    });
    const mape = percentageErrors.reduce((sum, e) => sum + e, 0) / percentageErrors.length;

    // Bias analysis (are we consistently over or under-forecasting?)
    const biases = replacedForecasts.map(p => {
      const forecast = Number(p.original_forecast_amount || 0);
      const actual = Number(p.total_amount || 0);
      return forecast - actual; // Positive = over-forecast, Negative = under-forecast
    });
    const averageBias = biases.reduce((sum, b) => sum + b, 0) / biases.length;
    const biasPercentage = replacedForecasts.length > 0
      ? (averageBias / (replacedForecasts.reduce((sum, p) => sum + Number(p.total_amount || 0), 0) / replacedForecasts.length)) * 100
      : 0;

    // Accuracy by modeling method
    const byMethod: Record<string, { count: number; totalAccuracy: number; avgAccuracy: number }> = {};
    replacedForecasts.forEach(p => {
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

    // Monthly accuracy trends
    const monthlyTrends: Record<string, { count: number; totalAccuracy: number; avgAccuracy: number }> = {};
    replacedForecasts.forEach(p => {
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

    // Calculate improvement rate (comparing first half vs second half)
    const halfPoint = Math.floor(replacedForecasts.length / 2);
    const firstHalfAccuracy = replacedForecasts
      .slice(halfPoint)
      .reduce((sum, p) => sum + (p.forecast_accuracy_percentage || 0), 0) / Math.max(1, replacedForecasts.length - halfPoint);
    const secondHalfAccuracy = replacedForecasts
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
      totalComparisons: replacedForecasts.length,
      overallAccuracy: parseFloat(overallAccuracy.toFixed(2)),
      averageAbsoluteError: parseFloat(averageAbsoluteError.toFixed(2)),
      mape: parseFloat(mape.toFixed(2)),
      averageBias: parseFloat(averageBias.toFixed(2)),
      biasPercentage: parseFloat(biasPercentage.toFixed(2)),
      improvementRate: parseFloat(improvementRate.toFixed(2)),
      byMethod,
      trends,
      insights,
      recentComparisons: replacedForecasts.slice(0, 5).map(p => ({
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
