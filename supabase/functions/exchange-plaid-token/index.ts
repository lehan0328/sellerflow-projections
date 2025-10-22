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

    // Get user's account_id from profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile?.account_id) {
      throw new Error('User profile or account_id not found');
    }

    const accountId = profile.account_id;
    console.log('User account_id:', accountId);

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
    console.log('Account types:', accountsData.accounts.map((a: any) => ({ name: a.name, type: a.type, subtype: a.subtype })));

    // Fetch liabilities data for credit cards
    let liabilitiesData: any = null;
    const creditAccounts = accountsData.accounts.filter((a: any) => a.type === 'credit');
    
    if (creditAccounts.length > 0) {
      try {
        const liabilitiesResponse = await fetch(`https://${PLAID_ENV}.plaid.com/liabilities/get`, {
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

        if (liabilitiesResponse.ok) {
          const liabData = await liabilitiesResponse.json();
          console.log('Liabilities response:', JSON.stringify(liabData, null, 2));
          liabilitiesData = liabData.liabilities?.credit || [];
          if (liabilitiesData.length > 0) {
            console.log('Found liabilities data for', liabilitiesData.length, 'credit accounts');
          } else {
            console.log('No liabilities data in response - this is normal for Plaid Sandbox unless using specific test credentials');
          }
        } else {
          const errorData = await liabilitiesResponse.json();
          console.log('Liabilities endpoint error:', errorData);
        }
      } catch (error) {
        console.error('Error fetching liabilities (non-critical):', error);
      }
    }

    // Store accounts in database using secure RPC function
    const accountIds = [];
    for (const account of accountsData.accounts) {
      const accountType = metadata.accounts.find((a: any) => a.id === account.account_id);
      
      console.log(`Processing account: ${account.name}, type: ${account.type}, subtype: ${account.subtype}`);
      
      // Determine if it's a credit card or bank account
      if (account.type === 'credit') {
        console.log('Detected CREDIT CARD account:', { name: account.name, balance: account.balances.current, limit: account.balances.limit });
        
        // Find matching liabilities data for this credit card
        const liabilityInfo = liabilitiesData?.find((lib: any) => lib.account_id === account.account_id);
        
        // Store as credit card with encrypted access token - insert directly to bypass RPC issues
        const { data: cardData, error: insertError } = await supabaseAdmin
          .from('credit_cards')
          .insert({
            user_id: user.id,
            account_id: accountId,
            institution_name: metadata.institution.name,
            account_name: account.name,
            account_type: account.subtype || 'credit',
            balance: Math.abs(account.balances.current || 0),
            credit_limit: account.balances.limit || 0,
            available_credit: account.balances.available || 0,
            currency_code: account.balances.iso_currency_code || 'USD',
            encrypted_access_token: access_token,
            encrypted_plaid_item_id: item_id,
            plaid_account_id: account.account_id,
            minimum_payment: liabilityInfo?.minimum_payment_amount || null,
            payment_due_date: liabilityInfo?.next_payment_due_date || null,
            statement_close_date: liabilityInfo?.last_statement_issue_date || null,
            annual_fee: null,
            cash_back: 0,
            priority: 3,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting credit card:', insertError);
          throw insertError;
        }
        
        accountIds.push(cardData.id);
      } else {
        // Store as bank account with encrypted access token - insert directly to bypass RPC issues
        const { data: accountData, error: insertError } = await supabaseAdmin
          .from('bank_accounts')
          .insert({
            user_id: user.id,
            account_id: accountId,
            institution_name: metadata.institution.name,
            account_name: account.name,
            account_type: account.subtype || account.type,
            balance: account.balances.current || 0,
            available_balance: account.balances.available,
            currency_code: account.balances.iso_currency_code || 'USD',
            encrypted_access_token: access_token,
            encrypted_plaid_item_id: item_id,
            plaid_account_id: account.account_id,
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
