import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's current account_id from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.account_id) {
      throw new Error('Profile not found');
    }

    const currentAccountId = profile.account_id;

    // Find all bank accounts for this user across ALL account_ids
    const { data: allBankAccounts } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, account_name, account_id, balance, available_balance, is_active, plaid_account_id')
      .eq('user_id', user.id);

    // Find all credit cards for this user across ALL account_ids
    const { data: allCreditCards } = await supabaseAdmin
      .from('credit_cards')
      .select('id, account_name, account_id, balance, is_active, plaid_account_id')
      .eq('user_id', user.id);

    const wrongAccountIdBanks = allBankAccounts?.filter(acc => acc.account_id !== currentAccountId) || [];
    const wrongAccountIdCards = allCreditCards?.filter(acc => acc.account_id !== currentAccountId) || [];

    console.log(`Found ${wrongAccountIdBanks.length} bank accounts with wrong account_id`);
    console.log(`Found ${wrongAccountIdCards.length} credit cards with wrong account_id`);

    // Option 1: Update to correct account_id
    // Option 2: Delete if duplicate
    
    const results = {
      currentAccountId,
      wrongAccountIdBanks,
      wrongAccountIdCards,
      actions: []
    };

    // For each wrong-account-id bank, check if there's a duplicate in the correct account_id
    for (const bank of wrongAccountIdBanks) {
      const duplicate = allBankAccounts?.find(b => 
        b.account_id === currentAccountId && 
        b.plaid_account_id === bank.plaid_account_id &&
        b.id !== bank.id
      );

      if (duplicate) {
        // Delete the duplicate
        console.log(`Deleting duplicate bank account: ${bank.account_name} (${bank.id})`);
        await supabaseAdmin.from('bank_accounts').delete().eq('id', bank.id);
        results.actions.push(`Deleted duplicate bank: ${bank.account_name}`);
      } else if (!bank.plaid_account_id) {
        // Manual account with wrong account_id - update it
        console.log(`Updating manual bank account: ${bank.account_name} to correct account_id`);
        await supabaseAdmin.from('bank_accounts').update({ account_id: currentAccountId }).eq('id', bank.id);
        results.actions.push(`Updated bank: ${bank.account_name} to correct account`);
      } else {
        // Plaid account with wrong account_id - likely orphaned, delete it
        console.log(`Deleting orphaned bank account: ${bank.account_name}`);
        await supabaseAdmin.from('bank_accounts').delete().eq('id', bank.id);
        results.actions.push(`Deleted orphaned bank: ${bank.account_name}`);
      }
    }

    // Same for credit cards
    for (const card of wrongAccountIdCards) {
      const duplicate = allCreditCards?.find(c => 
        c.account_id === currentAccountId && 
        c.plaid_account_id === card.plaid_account_id &&
        c.id !== card.id
      );

      if (duplicate) {
        console.log(`Deleting duplicate credit card: ${card.account_name} (${card.id})`);
        await supabaseAdmin.from('credit_cards').delete().eq('id', card.id);
        results.actions.push(`Deleted duplicate card: ${card.account_name}`);
      } else if (!card.plaid_account_id) {
        console.log(`Updating manual credit card: ${card.account_name} to correct account_id`);
        await supabaseAdmin.from('credit_cards').update({ account_id: currentAccountId }).eq('id', card.id);
        results.actions.push(`Updated card: ${card.account_name} to correct account`);
      } else {
        console.log(`Deleting orphaned credit card: ${card.account_name}`);
        await supabaseAdmin.from('credit_cards').delete().eq('id', card.id);
        results.actions.push(`Deleted orphaned card: ${card.account_name}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
