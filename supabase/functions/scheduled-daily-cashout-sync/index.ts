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

    console.log('[DAILY CASHOUT SYNC] Starting daily cash-out detection...');

    // Get all active Amazon accounts with daily payouts
    const { data: amazonAccounts, error: accountsError } = await supabase
      .from('amazon_accounts')
      .select('id, user_id, account_id, account_name, payout_model, payout_frequency')
      .eq('is_active', true)
      .or('payout_model.eq.daily,payout_frequency.eq.daily');

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    if (!amazonAccounts || amazonAccounts.length === 0) {
      console.log('[DAILY CASHOUT SYNC] No daily payout accounts found');
      return new Response(
        JSON.stringify({ success: true, accountsProcessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DAILY CASHOUT SYNC] Processing ${amazonAccounts.length} daily payout accounts`);

    let cashOutsDetected = 0;
    let errors = 0;

    for (const account of amazonAccounts) {
      try {
        console.log(`[DAILY CASHOUT SYNC] Checking account: ${account.account_name} (${account.id})`);

        // Call the track-daily-cashout function for each account
        const { data: result, error: trackError } = await supabase.functions.invoke('track-daily-cashout', {
          body: {
            amazonAccountId: account.id,
            userId: account.user_id,
            accountId: account.account_id
          }
        });

        if (trackError) {
          console.error(`[DAILY CASHOUT SYNC] Error for account ${account.id}:`, trackError);
          errors++;
          continue;
        }

        if (result?.cashOutDetected) {
          cashOutsDetected++;
          console.log(`[DAILY CASHOUT SYNC] ✅ Cash-out detected for ${account.account_name}: $${result.amount?.toFixed(2)} on ${result.cashOutDate}`);
        }

      } catch (error) {
        console.error(`[DAILY CASHOUT SYNC] Error processing account ${account.id}:`, error);
        errors++;
      }
    }

    console.log(`[DAILY CASHOUT SYNC] Complete. Accounts: ${amazonAccounts.length}, Cash-outs: ${cashOutsDetected}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        accountsProcessed: amazonAccounts.length,
        cashOutsDetected: cashOutsDetected,
        errors: errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[DAILY CASHOUT SYNC] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
