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

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[ENABLE-FORECASTS] Enabling forecasts for user:', user.id);

    // Get account_id from profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.account_id) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enable forecasts in user_settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('user_settings')
      .upsert({
        user_id: user.id,
        account_id: profile.account_id,
        forecasts_enabled: true,
        forecast_confidence_threshold: 8,
        forecasts_disabled_at: null,
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (settingsError) {
      console.error('[ENABLE-FORECASTS] Error updating settings:', settingsError);
      return new Response(JSON.stringify({ error: settingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[ENABLE-FORECASTS] Settings updated successfully:', settings);

    // Invoke forecast generation
    console.log('[ENABLE-FORECASTS] Generating forecasts...');
    const { error: forecastError } = await supabaseClient.functions.invoke('forecast-amazon-payouts-math', {
      body: { userId: user.id }
    });

    if (forecastError) {
      console.error('[ENABLE-FORECASTS] Error generating forecasts:', forecastError);
    } else {
      console.log('[ENABLE-FORECASTS] Forecasts generated successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Forecasts enabled successfully',
        settings 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ENABLE-FORECASTS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
