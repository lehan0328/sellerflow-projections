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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Starting scheduled bank transaction sync...');

    // Get all active bank accounts with encrypted tokens
    const { data: bankAccounts, error: bankFetchError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, user_id, institution_name, account_name, encrypted_access_token')
      .eq('is_active', true)
      .not('encrypted_access_token', 'is', null);

    if (bankFetchError) {
      console.error('Error fetching bank accounts:', bankFetchError);
      throw bankFetchError;
    }

    // Get all active credit cards with encrypted tokens
    const { data: creditCards, error: creditFetchError } = await supabaseAdmin
      .from('credit_cards')
      .select('id, user_id, institution_name, account_name, encrypted_access_token')
      .eq('is_active', true)
      .not('encrypted_access_token', 'is', null);

    if (creditFetchError) {
      console.error('Error fetching credit cards:', creditFetchError);
      throw creditFetchError;
    }

    const accounts = [
      ...(bankAccounts || []).map(acc => ({ ...acc, accountType: 'bank' })),
      ...(creditCards || []).map(card => ({ ...card, accountType: 'credit' }))
    ];

    if (accounts.length === 0) {
      console.log('No active accounts found to sync');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active accounts to sync',
          synced: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${bankAccounts?.length || 0} bank accounts and ${creditCards?.length || 0} credit cards to sync`);

    // Sync each account
    const results = [];
    for (const account of accounts) {
      try {
        console.log(`Syncing ${account.accountType} account: ${account.institution_name} - ${account.account_name} (${account.id})`);
        
        // Get user's auth token
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(account.user_id);
        
        if (userError || !user) {
          console.error(`Failed to get user for account ${account.id}:`, userError);
          results.push({
            accountId: account.id,
            success: false,
            error: 'User not found'
          });
          continue;
        }

        // Call sync-plaid-transactions function
        const { data, error: syncError } = await supabaseAdmin.functions.invoke('sync-plaid-transactions', {
          body: { 
            accountId: account.id, 
            isInitialSync: false,
            accountType: account.accountType
          },
        });

        if (syncError) {
          console.error(`Failed to sync ${account.accountType} account ${account.id}:`, syncError);
          results.push({
            accountId: account.id,
            accountType: account.accountType,
            institutionName: account.institution_name,
            accountName: account.account_name,
            success: false,
            error: syncError.message
          });
        } else {
          console.log(`Successfully synced ${account.accountType} account ${account.id}:`, data);
          results.push({
            accountId: account.id,
            accountType: account.accountType,
            institutionName: account.institution_name,
            accountName: account.account_name,
            success: true,
            count: data?.count || 0
          });
        }
      } catch (error) {
        console.error(`Error processing ${account.accountType} account ${account.id}:`, error);
        results.push({
          accountId: account.id,
          accountType: account.accountType,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalTransactions = results.reduce((sum, r) => sum + (r.count || 0), 0);

    console.log(`Completed sync: ${successCount}/${accounts.length} accounts successful, ${totalTransactions} total transactions synced`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Synced ${successCount}/${accounts.length} accounts`,
        synced: successCount,
        total: accounts.length,
        totalTransactions,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scheduled-bank-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});