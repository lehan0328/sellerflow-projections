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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from JWT
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
    console.log('[CLEANUP] Starting forecast cleanup for user:', userId);

    // Get user's account_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', userId)
      .single();

    if (!profile?.account_id) {
      throw new Error('User profile not found');
    }

    // Delete ALL forecasted payouts for this account
    console.log('[CLEANUP] Deleting all forecasted payouts...');
    const { error: deleteError, count } = await supabase
      .from('amazon_payouts')
      .delete({ count: 'exact' })
      .eq('account_id', profile.account_id)
      .eq('status', 'forecasted');

    if (deleteError) {
      console.error('[CLEANUP] Error deleting forecasts:', deleteError);
      throw deleteError;
    }

    console.log(`[CLEANUP] Deleted ${count || 0} stale forecasts`);

    // Now regenerate forecasts
    console.log('[CLEANUP] Regenerating forecasts...');
    const { data: forecastData, error: forecastError } = await supabase.functions.invoke(
      'forecast-amazon-payouts',
      {
        headers: { Authorization: authHeader },
        body: { forceRegenerate: true }
      }
    );

    if (forecastError) {
      console.error('[CLEANUP] Error regenerating forecasts:', forecastError);
      throw forecastError;
    }

    console.log('[CLEANUP] Forecasts regenerated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: count || 0,
        message: `Cleaned up ${count || 0} stale forecasts and regenerated new ones`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CLEANUP] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
