import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    // Get request body
    const { amazonAccountId, amount, drawDate, settlementId } = await req.json();

    if (!amazonAccountId || !amount || !settlementId) {
      throw new Error('Missing required fields: amazonAccountId, amount, settlementId');
    }

    // Get user's account_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.account_id) {
      throw new Error('User profile not found');
    }

    const today = drawDate || new Date().toISOString().split('T')[0];

    // Fetch the open settlement to get period dates
    const { data: settlement, error: settlementError } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('settlement_id', settlementId)
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'estimated')
      .single();

    if (settlementError || !settlement) {
      console.error('Settlement not found:', settlementError);
      throw new Error('Open settlement not found');
    }

    const metadata = settlement.raw_settlement_data?.forecast_metadata;
    const settlementStart = metadata?.settlement_period?.start || today;
    const settlementEnd = metadata?.settlement_period?.end || today;

    // Record the daily draw with full settlement context
    const { data: draw, error: drawError } = await supabase
      .from('amazon_daily_draws')
      .insert({
        user_id: user.id,
        account_id: profile.account_id,
        amazon_account_id: amazonAccountId,
        draw_date: today,
        amount: amount,
        settlement_id: settlementId,
        settlement_period_start: settlementStart,
        settlement_period_end: settlementEnd,
      })
      .select()
      .single();

    if (drawError) {
      console.error('Error recording draw:', drawError);
      throw drawError;
    }

    console.log('Daily draw recorded successfully:', draw.id);

    // Trigger recalculation of daily payouts
    const { error: recalcError } = await supabase.functions.invoke('recalculate-daily-payouts', {
      body: {
        amazonAccountId,
        settlementId,
        drawAmount: amount
      }
    });

    if (recalcError) {
      console.error('Error recalculating payouts:', recalcError);
      // Don't fail the whole operation if recalc fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        draw_id: draw.id,
        message: 'Daily draw recorded successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in record-daily-draw:', error);
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
