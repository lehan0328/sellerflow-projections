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

    const { amazonAccountId, userId } = await req.json();

    if (!amazonAccountId || !userId) {
      throw new Error('amazonAccountId and userId are required');
    }

    // --- MODIFIED SECTION: USE UTC DATE ---
    // Get today's date in UTC
    // This removes the manual EST offset and uses the server's standard UTC time.
    const todayStr = new Date().toISOString().split('T')[0]; 
    // --------------------------------------

    // 1. Find the Last Confirmed Payout Date
    // This acts as our "floor" - we assume any forecast BEFORE this date was covered by this payout.
    const { data: lastConfirmed } = await supabase
      .from('amazon_payouts')
      .select('payout_date')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'confirmed')
      .order('payout_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastConfirmedDate = lastConfirmed?.payout_date || '1970-01-01'; 

    // 2. Fetch ALL past forecasts (older than today)
    const { data: pastForecasts, error: fetchError } = await supabase
      .from('amazon_payouts')
      .select('id, payout_date, total_amount')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'forecasted')
      .lt('payout_date', todayStr)
      .order('payout_date', { ascending: true });

    if (fetchError) throw fetchError;

    if (!pastForecasts || pastForecasts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No past forecasts to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Segregate: Which ones to ADD vs. Just MARK
    let totalToAdd = 0;
    const idsToMark = pastForecasts.map(f => f.id); // We roll over ALL past forecasts

    for (const forecast of pastForecasts) {
      // ONLY add the amount if the forecast date is AFTER the last confirmed payout.
      if (forecast.payout_date > lastConfirmedDate) {
        totalToAdd += (Number(forecast.total_amount) || 0);
      }
    }

    // 4. Fetch Target Forecast (Today)
    const { data: todayForecast, error: todayError } = await supabase
      .from('amazon_payouts')
      .select('id, total_amount')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'forecasted')
      .eq('payout_date', todayStr)
      .maybeSingle();

    if (todayError) throw todayError;

    if (!todayForecast) {
      // Safety check: If we have money to move but nowhere to put it, abort.
      if (totalToAdd > 0) {
        console.error('[ROLLOVER] Critical: No target forecast for today to receive rollover funds.');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'No forecast exists for today. Cannot rollover funds safely.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'No target for today, nothing changed.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Execute Updates
    
    // A. Update today's total
    if (totalToAdd > 0) {
      const newTotal = (Number(todayForecast.total_amount) || 0) + totalToAdd;
      const { error: updateTodayError } = await supabase
        .from('amazon_payouts')
        .update({
          total_amount: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', todayForecast.id);

      if (updateTodayError) throw updateTodayError;
    }

    // B. Mark ALL past forecasts as 'rolled_over'
    // This cleans up the calendar, removing duplicates/stale entries
    const { error: updatePastError } = await supabase
      .from('amazon_payouts')
      .update({
        status: 'rolled_over',
        updated_at: new Date().toISOString()
      })
      .in('id', idsToMark);

    if (updatePastError) throw updatePastError;

    return new Response(
      JSON.stringify({
        success: true,
        rolloverOccurred: true,
        rolledAmount: totalToAdd,
        cleanedCount: idsToMark.length,
        message: `Carried forward $${totalToAdd}. Cleaned up ${idsToMark.length} past forecasts.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ROLLOVER] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});