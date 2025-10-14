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

    const userId = user.id;
    console.log('[DISABLE-FORECASTS] Disabling forecasts for user:', userId);

    // Get user's account_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.account_id) {
      throw new Error('User profile not found');
    }

    // Delete all forecasted payouts for this user's account
    const { error: deleteError } = await supabase
      .from('amazon_payouts')
      .delete()
      .eq('account_id', profile.account_id)
      .eq('status', 'forecasted');

    if (deleteError) {
      console.error('[DISABLE-FORECASTS] Error deleting forecasts:', deleteError);
      throw new Error('Failed to delete forecasted payouts');
    }

    console.log('[DISABLE-FORECASTS] ✅ All forecasted payouts deleted');

    // Update user settings to mark forecasts as disabled
    const { error: updateError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        account_id: profile.account_id,
        forecasts_enabled: false,
        forecasts_disabled_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('[DISABLE-FORECASTS] Error updating settings:', updateError);
      throw new Error('Failed to update forecast settings');
    }

    console.log('[DISABLE-FORECASTS] ✅ Forecast settings updated');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'AI forecasts disabled and all forecasted payouts removed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[DISABLE-FORECASTS] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});