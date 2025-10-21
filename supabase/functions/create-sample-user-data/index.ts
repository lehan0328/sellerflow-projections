import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[CREATE-SAMPLE-DATA] Creating sample data for user:', userId);

    // Get user's account_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('account_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.account_id) {
      console.error('[CREATE-SAMPLE-DATA] Profile error:', profileError);
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create sample Amazon account
    const { data: amazonAccount, error: amazonError } = await supabaseClient
      .from('amazon_accounts')
      .insert({
        user_id: userId,
        account_id: profile.account_id,
        seller_id: 'SAMPLE' + Math.random().toString(36).substring(7).toUpperCase(),
        marketplace_id: 'ATVPDKIKX0DER',
        marketplace_name: 'Amazon.com',
        account_name: 'Demo Store',
        payout_frequency: 'bi-weekly',
        payout_model: 'bi-weekly',
        is_active: true,
        last_sync: new Date().toISOString()
      })
      .select()
      .single();

    if (amazonError) {
      console.error('[CREATE-SAMPLE-DATA] Amazon account error:', amazonError);
      return new Response(JSON.stringify({ error: amazonError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[CREATE-SAMPLE-DATA] Created Amazon account:', amazonAccount.id);

    // Call the existing create-sample-amazon-data function to populate transactions
    const { error: sampleDataError } = await supabaseClient.functions.invoke('create-sample-amazon-data', {
      body: { 
        userId: userId,
        amazonAccountId: amazonAccount.id
      }
    });

    if (sampleDataError) {
      console.error('[CREATE-SAMPLE-DATA] Error creating sample data:', sampleDataError);
    }

    // Enable forecasts
    const { error: settingsError } = await supabaseClient
      .from('user_settings')
      .upsert({
        user_id: userId,
        account_id: profile.account_id,
        forecasts_enabled: true,
        forecast_confidence_threshold: 8,
      }, {
        onConflict: 'user_id'
      });

    if (settingsError) {
      console.error('[CREATE-SAMPLE-DATA] Settings error:', settingsError);
    }

    // Generate forecasts
    const { error: forecastError } = await supabaseClient.functions.invoke('forecast-amazon-payouts-math', {
      body: { userId: userId }
    });

    if (forecastError) {
      console.error('[CREATE-SAMPLE-DATA] Forecast error:', forecastError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sample data created successfully',
        amazonAccountId: amazonAccount.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[CREATE-SAMPLE-DATA] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
