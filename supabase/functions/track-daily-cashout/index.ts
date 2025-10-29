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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { amazonAccountId, userId, accountId } = await req.json();

    console.log(`[CASHOUT TRACKER] Checking for cash-outs on account: ${amazonAccountId}`);

    // Get the two most recent open settlements
    const { data: openSettlements } = await supabase
      .from('amazon_payouts')
      .select('id, payout_date, raw_settlement_data, total_amount')
      .eq('amazon_account_id', amazonAccountId)
      .eq('status', 'estimated')
      .order('payout_date', { ascending: false })
      .limit(2);

    if (!openSettlements || openSettlements.length === 0) {
      console.log('[CASHOUT TRACKER] No open settlements found');
      return new Response(
        JSON.stringify({ success: true, cashOutDetected: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we have 2 settlements, check if a cash-out occurred between them
    if (openSettlements.length === 2) {
      const latest = openSettlements[0];
      const previous = openSettlements[1];
      
      const latestData = latest.raw_settlement_data as any;
      const previousData = previous.raw_settlement_data as any;
      
      const latestStart = new Date(latestData?.FinancialEventGroupStart || latest.payout_date);
      const previousEnd = new Date(previousData?.FinancialEventGroupEnd || previous.payout_date);
      
      // If latest settlement started AFTER previous ended, a cash-out occurred
      if (latestStart > previousEnd) {
        const cashOutDate = new Date(previousEnd);
        cashOutDate.setDate(cashOutDate.getDate() + 1); // Cash-out is the day after settlement end
        
        console.log(`[CASHOUT TRACKER] Cash-out detected on ${cashOutDate.toISOString().split('T')[0]}`);
        
        // Check if we already recorded this cash-out
        const { data: existingDraw } = await supabase
          .from('amazon_daily_draws')
          .select('id')
          .eq('amazon_account_id', amazonAccountId)
          .eq('draw_date', cashOutDate.toISOString().split('T')[0])
          .maybeSingle();
        
        if (!existingDraw) {
          // Calculate the amount (from previous settlement's BeginningBalance)
          const cashOutAmount = previousData?.BeginningBalance || previous.total_amount || 0;
          
          // Record the cash-out draw
          const { error: insertError } = await supabase
            .from('amazon_daily_draws')
            .insert({
              user_id: userId,
              account_id: accountId,
              amazon_account_id: amazonAccountId,
              settlement_id: previousData?.SettlementId || `settlement_${previous.payout_date}`,
              settlement_period_start: previousData?.FinancialEventGroupStart || previous.payout_date,
              settlement_period_end: previousData?.FinancialEventGroupEnd || previous.payout_date,
              draw_date: cashOutDate.toISOString().split('T')[0],
              amount: cashOutAmount,
              notes: 'Auto-detected cash-out from new settlement period',
              raw_data: previousData
            });
          
          if (insertError) {
            console.error('[CASHOUT TRACKER] Error recording draw:', insertError);
          } else {
            console.log(`[CASHOUT TRACKER] Recorded cash-out: $${cashOutAmount.toFixed(2)} on ${cashOutDate.toISOString().split('T')[0]}`);
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            cashOutDetected: true,
            cashOutDate: cashOutDate.toISOString().split('T')[0],
            amount: previousData?.BeginningBalance || 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Calculate current cumulative available
    const latest = openSettlements[0];
    const latestData = latest.raw_settlement_data as any;
    const beginningBalance = latestData?.BeginningBalance || 0;
    const settlementStart = latestData?.FinancialEventGroupStart || latest.payout_date;
    
    // Get total draws since settlement started
    const { data: draws } = await supabase
      .from('amazon_daily_draws')
      .select('amount')
      .eq('amazon_account_id', amazonAccountId)
      .gte('draw_date', settlementStart);
    
    const totalDraws = draws?.reduce((sum, draw) => sum + (draw.amount || 0), 0) || 0;
    const currentAvailable = Math.max(0, beginningBalance - totalDraws);
    
    console.log(`[CASHOUT TRACKER] Current available: $${currentAvailable.toFixed(2)} (Beginning: $${beginningBalance.toFixed(2)}, Draws: $${totalDraws.toFixed(2)})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cashOutDetected: false,
        currentAvailable: currentAvailable,
        beginningBalance: beginningBalance,
        totalDraws: totalDraws
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CASHOUT TRACKER] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
