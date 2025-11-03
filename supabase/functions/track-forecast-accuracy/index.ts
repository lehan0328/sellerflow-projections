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

    // Find the most recent forecast for this payout date and amazon account
    const { data: forecast, error: forecastError } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('amazon_account_id', actualPayout.amazon_account_id)
      .eq('payout_date', actualPayout.payout_date)
      .eq('status', 'forecasted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (forecastError) {
      console.error('[ACCURACY] Error fetching forecast:', forecastError);
      throw forecastError;
    }

    if (!forecast) {
      console.log('[ACCURACY] No forecast found for this payout, skipping accuracy tracking');
      return new Response(
        JSON.stringify({ success: true, message: 'No forecast to compare' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const forecastedAmount = forecast.total_amount;
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
        forecasted_amount: forecastedAmount,
        actual_amount: actualAmount,
        difference_amount: differenceAmount,
        difference_percentage: differencePercentage,
        settlement_id: actualPayout.settlement_id,
        marketplace_name: actualPayout.marketplace_name,
        modeling_method: forecast.modeling_method || 'auren_forecast_v1',
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

    console.log('[ACCURACY] Successfully logged forecast accuracy');

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
