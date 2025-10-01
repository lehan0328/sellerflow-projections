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
    const { accountId, accountType } = await req.json();
    
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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Syncing ${accountType} account:`, accountId);

    // Get the account from database
    const tableName = accountType === 'credit_card' ? 'credit_cards' : 'bank_accounts';
    const { data: account, error: fetchError } = await supabase
      .from(tableName)
      .select('encrypted_access_token, encrypted_plaid_item_id, plaid_account_id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !account) {
      throw new Error('Account not found');
    }

    // Decrypt the access token using the secure function
    const { data: accessToken, error: decryptError } = await supabase.rpc('decrypt_banking_credential', {
      encrypted_text: account.encrypted_access_token
    });

    if (decryptError || !accessToken) {
      throw new Error('Failed to decrypt access token');
    }

    // Get latest balance from Plaid
    const response = await fetch(`https://${PLAID_ENV}.plaid.com/accounts/balance/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: accessToken,
        options: {
          account_ids: account.plaid_account_id ? [account.plaid_account_id] : undefined,
        },
      }),
    });

    const balanceData = await response.json();
    
    if (!response.ok) {
      console.error('Plaid API error:', balanceData);
      throw new Error(balanceData.error_message || 'Failed to fetch balance');
    }

    const plaidAccount = balanceData.accounts[0];
    
    if (!plaidAccount) {
      throw new Error('Account not found in Plaid');
    }

    // Update the account in database using secure RPC function
    if (accountType === 'credit_card') {
      const { error: updateError } = await supabase.rpc('update_secure_credit_card', {
        p_card_id: accountId,
        p_balance: Math.abs(plaidAccount.balances.current || 0),
        p_available_credit: plaidAccount.balances.available || 0,
      });

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: updateError } = await supabase.rpc('update_secure_bank_account', {
        p_account_id: accountId,
        p_balance: plaidAccount.balances.current || 0,
        p_available_balance: plaidAccount.balances.available,
      });

      if (updateError) {
        throw updateError;
      }
    }

    console.log('Successfully synced account');

    return new Response(
      JSON.stringify({ 
        success: true,
        balance: plaidAccount.balances.current,
        message: 'Account synced successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-plaid-accounts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
