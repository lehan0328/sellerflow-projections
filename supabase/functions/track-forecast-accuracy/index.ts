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

    const { actualPayout } = await req.json();

    console.log('[ACCURACY] Tracking forecast accuracy for payout:', actualPayout.id);

    // Helper function to convert UTC timestamp to EST date
    const toESTDate = (utcTimestamp: string): string => {
      const date = new Date(utcTimestamp);
      // Format in EST timezone
      const estDateStr = date.toLocaleString('en-US', { 
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      // Convert from "MM/DD/YYYY" to "YYYY-MM-DD"
      const [month, day, year] = estDateStr.split(',')[0].split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };

    // Extract settlement dates from raw data
    const settlementEndDate = actualPayout.raw_settlement_data?.FinancialEventGroupEnd
      ? new Date(actualPayout.raw_settlement_data.FinancialEventGroupEnd)
      : new Date(actualPayout.payout_date);
    
    const settlementStartDate = actualPayout.raw_settlement_data?.FinancialEventGroupStart
      ? new Date(actualPayout.raw_settlement_data.FinancialEventGroupStart)
      : null;
    
    // CRITICAL: Convert UTC timestamps to EST for consistent timezone
    // This ensures dates are consistent across the app
    const settlementCloseDate = actualPayout.raw_settlement_data?.FinancialEventGroupEnd
      ? toESTDate(actualPayout.raw_settlement_data.FinancialEventGroupEnd)
      : settlementEndDate.toISOString().split('T')[0];
    
    const settlementStartDateStr = actualPayout.raw_settlement_data?.FinancialEventGroupStart
      ? toESTDate(actualPayout.raw_settlement_data.FinancialEventGroupStart)
      : null;
    
    // Look back up to 7 days from settlement close
    const lookbackStart = new Date(settlementCloseDate);
    lookbackStart.setDate(lookbackStart.getDate() - 7);

    const { data: rolledForecasts, error: forecastError } = await supabase
      .from('amazon_payouts')
      .select('id, payout_date, total_amount, modeling_method, settlement_id')
      .eq('amazon_account_id', actualPayout.amazon_account_id)
      .eq('user_id', actualPayout.user_id) // CRITICAL: Match user_id
      .eq('status', 'forecasted')
      .gte('payout_date', lookbackStart.toISOString().split('T')[0])
      .lt('payout_date', settlementCloseDate) // CRITICAL: < not <=
      .order('payout_date', { ascending: true });

    if (forecastError) {
      console.error('[ACCURACY] Error fetching forecasts:', forecastError);
      throw forecastError;
    }

    if (!rolledForecasts || rolledForecasts.length === 0) {
      console.log('[ACCURACY] No forecasts found for this payout, skipping accuracy tracking');
      return new Response(
        JSON.stringify({ success: true, message: 'No forecast to compare' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the most recent forecast (it already contains all rollovers)
    const mostRecentForecast = rolledForecasts[rolledForecasts.length - 1]; // Already sorted ascending
    const totalForecastedAmount = Number(mostRecentForecast.total_amount);
    
    // Calculate days accumulated in settlement period
    const daysAccumulated = settlementStartDate && settlementEndDate
      ? Math.ceil((settlementEndDate.getTime() - settlementStartDate.getTime()) / (1000 * 60 * 60 * 24))
      : 1; // Default to 1 day if no settlement dates
    
    // Capture forecast history (for debugging/transparency)
    const forecastDetails = rolledForecasts.map(f => ({
      date: f.payout_date,
      amount: Number(f.total_amount),
      method: f.modeling_method
    }));
    
    // Add note that only the most recent is used for accuracy
    console.log('[ACCURACY] Using most recent forecast for comparison:', {
      mostRecentDate: mostRecentForecast.payout_date,
      mostRecentAmount: totalForecastedAmount,
      allForecasts: forecastDetails
    });
    
    console.log('[ACCURACY] Rollover analysis:', {
      settlementPeriod: `${settlementStartDateStr} to ${settlementCloseDate}`,
      daysAccumulated,
      forecastsFound: rolledForecasts.length,
      mostRecentForecast: {
        date: mostRecentForecast.payout_date,
        amount: totalForecastedAmount
      },
      actual: actualPayout.total_amount,
      payoutReceived: actualPayout.payout_date
    });

    // Get user profile info and settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, monthly_revenue, account_id')
      .eq('user_id', actualPayout.user_id)
      .single();

    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('confidence_threshold')
      .eq('user_id', actualPayout.user_id)
      .single();

    // Get user email
    const { data: { user } } = await supabase.auth.admin.getUserById(actualPayout.user_id);

    const forecastedAmount = totalForecastedAmount;
    const actualAmount = actualPayout.total_amount;
    const differenceAmount = actualAmount - forecastedAmount;
    // Use MAPE (Mean Absolute Percentage Error) formula: |difference| / actual * 100
    const differencePercentage = actualAmount !== 0 
      ? (Math.abs(differenceAmount) / actualAmount) * 100
      : 0;

    const userName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown'
      : 'Unknown';

    console.log('[ACCURACY] Forecast accuracy:', {
      forecasted: forecastedAmount,
      actual: actualAmount,
      difference: differenceAmount,
      percentage: differencePercentage.toFixed(2) + '%',
      user: userName
    });

    // Upsert accuracy log to prevent duplicates
    const { error: insertError } = await supabase
      .from('forecast_accuracy_log')
      .upsert({
        user_id: actualPayout.user_id,
        account_id: profile?.account_id,
        amazon_account_id: actualPayout.amazon_account_id,
        payout_date: actualPayout.payout_date,
        settlement_close_date: settlementCloseDate,
        settlement_period_start: settlementStartDateStr,
        settlement_period_end: settlementCloseDate,
        days_accumulated: daysAccumulated,
        forecasted_amount: forecastedAmount,
        forecasted_amounts_by_day: forecastDetails,
        actual_amount: actualAmount,
        difference_amount: differenceAmount,
        difference_percentage: differencePercentage,
        settlement_id: actualPayout.settlement_id,
        marketplace_name: actualPayout.marketplace_name,
        modeling_method: mostRecentForecast.modeling_method || 'auren_forecast_v1',
        user_email: user?.email,
        user_name: userName,
        monthly_revenue: profile?.monthly_revenue,
        confidence_threshold: userSettings?.confidence_threshold || 0.80
      }, {
        onConflict: 'settlement_id',
        ignoreDuplicates: false
      });

    if (insertError) {
      console.error('[ACCURACY] Error inserting accuracy log:', insertError);
      throw insertError;
    }

    console.log('[ACCURACY] Successfully logged forecast accuracy with rollover support');

    return new Response(
      JSON.stringify({
        success: true,
        accuracy: {
          forecasted: forecastedAmount,
          actual: actualAmount,
          difference: differenceAmount,
          percentage: differencePercentage
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[ACCURACY] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
