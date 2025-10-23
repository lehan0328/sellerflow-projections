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
    const { accountId, isInitialSync = false, accountType = 'bank' } = await req.json();
    
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
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Create client with user's auth token
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    console.log(`Syncing transactions for ${accountType} account:`, accountId);

    // Get the account from database (bank or credit card)
    const tableName = accountType === 'credit' ? 'credit_cards' : 'bank_accounts';
    const { data: account, error: fetchError } = await supabase
      .from(tableName)
      .select('encrypted_access_token, plaid_account_id, account_id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !account) {
      throw new Error(`${accountType === 'credit' ? 'Credit card' : 'Account'} not found`);
    }

    // Decrypt the access token
    const { data: accessToken, error: decryptError } = await supabase.rpc('decrypt_banking_credential', {
      encrypted_text: account.encrypted_access_token
    });

    if (decryptError || !accessToken) {
      throw new Error('Failed to decrypt access token');
    }

    // Get transactions from Plaid
    // For initial sync, get last 30 days. For regular sync, get last 7 days
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (isInitialSync ? 30 : 7));
    
    const response = await fetch(`https://${PLAID_ENV}.plaid.com/transactions/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
        options: {
          account_ids: account.plaid_account_id ? [account.plaid_account_id] : undefined,
        },
      }),
    });

    const transactionsData = await response.json();
    
    if (!response.ok) {
      console.error('Plaid API error:', transactionsData);
      throw new Error(transactionsData.error_message || 'Failed to fetch transactions');
    }

    const transactions = transactionsData.transactions || [];
    console.log(`Found ${transactions.length} transactions`);

    // Insert or update transactions
    let insertedCount = 0;
    for (const transaction of transactions) {
      try {
        // Build transaction data based on account type
        const transactionData: any = {
          user_id: user.id,
          account_id: account.account_id,
          plaid_transaction_id: transaction.transaction_id,
          amount: transaction.amount,
          date: transaction.date,
          name: transaction.name,
          merchant_name: transaction.merchant_name,
          category: transaction.category,
          pending: transaction.pending,
          payment_channel: transaction.payment_channel,
          transaction_type: transaction.transaction_type,
          currency_code: transaction.iso_currency_code || 'USD',
          raw_data: transaction,
        };

        // Set either bank_account_id or credit_card_id based on account type
        if (accountType === 'credit') {
          transactionData.credit_card_id = accountId;
        } else {
          transactionData.bank_account_id = accountId;
        }

        // Check if transaction already exists
        const { data: existingTx } = await supabase
          .from('bank_transactions')
          .select('id')
          .eq('plaid_transaction_id', transaction.transaction_id)
          .eq(accountType === 'credit' ? 'credit_card_id' : 'bank_account_id', accountId)
          .single();

        let insertError = null;
        if (existingTx) {
          // Update existing transaction
          const { error } = await supabase
            .from('bank_transactions')
            .update(transactionData)
            .eq('id', existingTx.id);
          insertError = error;
        } else {
          // Insert new transaction
          const { error } = await supabase
            .from('bank_transactions')
            .insert(transactionData);
          insertError = error;
        }

        if (insertError) {
          console.error('Error inserting transaction:', insertError);
        } else {
          insertedCount++;
        }
      } catch (error) {
        console.error('Error processing transaction:', error);
      }
    }

    console.log(`Successfully synced ${insertedCount} transactions`);

    // Update last_sync timestamp (balance auto-updates via trigger)
    await supabase
      .from(tableName)
      .update({ last_sync: new Date().toISOString() })
      .eq('id', accountId);

    return new Response(
      JSON.stringify({ 
        success: true,
        count: insertedCount,
        message: `Synced ${insertedCount} transaction(s). Balance updated automatically.` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-plaid-transactions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
