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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    const { amazonAccountId, settlementId, drawAmount } = await req.json();

    if (!amazonAccountId || !settlementId) {
      throw new Error('Missing required fields: amazonAccountId, settlementId');
    }

    console.log('[RECALC] Recalculating daily payouts after draw:', {
      amazonAccountId,
      settlementId,
      drawAmount
    });

    const { data: settlement, error: settlementError } = await supabase
      .from('amazon_payouts')
      .select('*')
      .eq('settlement_id', settlementId)
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'estimated')
      .single();

    if (settlementError || !settlement) {
      console.error('[RECALC] Settlement not found:', settlementError);
      throw new Error('Open settlement not found');
    }

    const { data: allDraws, error: drawsError } = await supabase
      .from('amazon_daily_draws')
      .select('amount')
      .eq('amazon_account_id', amazonAccountId)
      .eq('settlement_id', settlementId);

    if (drawsError) {
      console.error('[RECALC] Error fetching draws:', drawsError);
      throw new Error('Failed to fetch draws');
    }

    const totalDrawn = (allDraws || []).reduce((sum, d) => sum + Number(d.amount), 0);
    console.log('[RECALC] Total drawn to date:', totalDrawn);

    const metadata = settlement.raw_settlement_data?.forecast_metadata;
    const settlementStart = metadata?.settlement_period?.start;
    const settlementEnd = metadata?.settlement_period?.end;
    const totalAmount = Number(settlement.total_amount || 0);

    if (!settlementStart || !settlementEnd) {
      console.error('[RECALC] Missing settlement period in metadata');
      throw new Error('Invalid settlement metadata');
    }

    const { data: volumeWeights } = await supabase
      .from('amazon_transactions_daily_summary')
      .select('transaction_date, net_amount')
      .eq('amazon_account_id', amazonAccountId)
      .gte('transaction_date', settlementStart)
      .lte('transaction_date', settlementEnd)
      .order('transaction_date', { ascending: true });

    const generateDistribution = (
      startDate: Date,
      endDate: Date,
      totalAmount: number,
      drawn: number,
      weights: any[]
    ) => {
      const distributions = [];
      const netAvailable = Math.max(0, totalAmount - drawn);
      
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const volumeMap = new Map();
      let totalVolume = 0;
      
      if (weights && weights.length > 0) {
        weights.forEach(w => {
          const amount = Math.abs(w.net_amount);
          volumeMap.set(w.transaction_date, amount);
          totalVolume += amount;
        });
      }
      
      let cumulative = 0;
      for (let i = 0; i < totalDays; i++) {
        const current = new Date(start);
        current.setDate(current.getDate() + i);
        const dateStr = current.toISOString().split('T')[0];
        
        let dailyUnlock = netAvailable / totalDays;
        if (totalVolume > 0 && volumeMap.has(dateStr)) {
          const weight = volumeMap.get(dateStr) / totalVolume;
          dailyUnlock = netAvailable * weight;
        }
        
        cumulative += dailyUnlock;
        distributions.push({
          date: dateStr,
          daily_unlock: Math.round(dailyUnlock * 100) / 100,
          cumulative_available: Math.round(cumulative * 100) / 100,
          days_accumulated: i + 1
        });
      }
      
      return distributions;
    };

    const newDistributions = generateDistribution(
      new Date(settlementStart),
      new Date(settlementEnd),
      totalAmount,
      totalDrawn,
      volumeWeights || []
    );

    console.log('[RECALC] Generated new distributions:', newDistributions.length);

    await supabase
      .from('amazon_payouts')
      .delete()
      .eq('amazon_account_id', amazonAccountId)
      .eq('settlement_id', settlementId)
      .eq('status', 'forecasted');

    const forecastsToInsert = newDistributions.map(dist => ({
      user_id: user.id,
      account_id: settlement.account_id,
      amazon_account_id: amazonAccountId,
      settlement_id: settlementId,
      payout_date: dist.date,
      total_amount: dist.cumulative_available,
      status: 'forecasted',
      payout_type: 'daily',
      currency_code: settlement.currency_code || 'USD',
      raw_settlement_data: {
        forecast_metadata: {
          method: 'cumulative_daily_distribution',
          settlement_period: {
            start: settlementStart,
            end: settlementEnd
          },
          daily_unlock_amount: dist.daily_unlock,
          cumulative_available: dist.cumulative_available,
          days_accumulated: dist.days_accumulated,
          total_drawn_to_date: totalDrawn,
          confidence: 95,
          recalculated_at: new Date().toISOString()
        }
      }
    }));

    if (forecastsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('amazon_payouts')
        .insert(forecastsToInsert);

      if (insertError) {
        console.error('[RECALC] Error inserting forecasts:', insertError);
        throw insertError;
      }

      console.log('[RECALC] Inserted', forecastsToInsert.length, 'new forecasts');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily payouts recalculated successfully',
        distributions: newDistributions.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in recalculate-daily-payouts:', error);
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
