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
    const { publicToken, metadata } = await req.json();
    
    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error('Plaid credentials not configured');
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Create client with user's token to maintain auth context
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    
    // Create client with user's auth token for RPC calls
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    console.log('Exchanging public token for user:', user.id);

    // Exchange public token for access token
    const response = await fetch(`https://${PLAID_ENV}.plaid.com/item/public_token/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        public_token: publicToken,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Plaid API error:', data);
      throw new Error(data.error_message || 'Failed to exchange token');
    }

    const { access_token, item_id } = data;

    // Get account details from Plaid
    const accountsResponse = await fetch(`https://${PLAID_ENV}.plaid.com/accounts/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: access_token,
      }),
    });

    const accountsData = await accountsResponse.json();
    
    if (!accountsResponse.ok) {
      console.error('Failed to get accounts:', accountsData);
      throw new Error('Failed to fetch account details');
    }

    console.log(`Found ${accountsData.accounts.length} accounts`);

    // Store accounts in database using secure RPC function
    const accountIds = [];
    for (const account of accountsData.accounts) {
      const accountType = metadata.accounts.find((a: any) => a.id === account.account_id);
      
      // Determine if it's a credit card or bank account
      if (account.type === 'credit') {
        // Store as credit card directly
        const { data: cardData, error: insertError } = await supabase
          .from('credit_cards')
          .insert({
            user_id: user.id,
            institution_name: metadata.institution.name,
            account_name: account.name,
            account_type: account.subtype || 'credit',
            balance: Math.abs(account.balances.current || 0),
            credit_limit: account.balances.limit || 0,
            available_credit: account.balances.available || 0,
            currency_code: account.balances.iso_currency_code || 'USD',
            plaid_account_id: account.account_id,
            last_sync: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting credit card:', insertError);
          throw insertError;
        }
        
        accountIds.push(cardData.id);
      } else {
        // Store as bank account directly
        const { data: accountData, error: insertError } = await supabase
          .from('bank_accounts')
          .insert({
            user_id: user.id,
            institution_name: metadata.institution.name,
            account_name: account.name,
            account_type: account.subtype || account.type,
            account_id: account.account_id,
            balance: account.balances.current || 0,
            available_balance: account.balances.available,
            currency_code: account.balances.iso_currency_code || 'USD',
            plaid_account_id: account.account_id,
            last_sync: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting bank account:', insertError);
          throw insertError;
        }
        
        accountIds.push(accountData.id);
      }
    }

    console.log('Successfully stored accounts:', accountIds);

    // Start background task to sync transactions for each account
    const syncPromises = accountIds.map(async (accountId) => {
      try {
        const { error: syncError } = await supabase.functions.invoke('sync-plaid-transactions', {
          body: { accountId, isInitialSync: true },
        });
        if (syncError) {
          console.error(`Failed to sync transactions for account ${accountId}:`, syncError);
        }
      } catch (error) {
        console.error(`Error syncing transactions for account ${accountId}:`, error);
      }
    });

    // Don't await - let it run in background
    Promise.all(syncPromises).catch(console.error);

    return new Response(
      JSON.stringify({ 
        success: true, 
        accountIds,
        message: `Successfully connected ${accountsData.accounts.length} account(s)` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in exchange-plaid-token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
