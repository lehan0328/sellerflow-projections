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
    const { publicToken, metadata, selectedAccountIds, priorities } = await req.json();
    
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
    // Check for both type === 'credit' AND subtype === 'credit card'
    let liabilitiesData: any = null;
    const creditAccounts = accountsData.accounts.filter((a: any) => 
      a.type === 'credit' || a.subtype === 'credit card' || a.subtype === 'credit'
    );
    
    console.log(`Checking for credit accounts. Found ${creditAccounts.length} credit-type accounts:`,
      creditAccounts.map((a: any) => ({ name: a.name, type: a.type, subtype: a.subtype }))
    );
    
    if (creditAccounts.length > 0) {
      try {
        console.log(`Attempting to fetch liabilities data for ${creditAccounts.length} credit account(s)`);
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
          console.log('Liabilities API response received');
          console.log('Full liabilities response:', JSON.stringify(liabData, null, 2));
          liabilitiesData = liabData.liabilities?.credit || [];
          if (liabilitiesData.length > 0) {
            console.log('Found liabilities data for', liabilitiesData.length, 'credit accounts');
            liabilitiesData.forEach((lib: any, idx: number) => {
              console.log(`Credit account ${idx + 1}:`, {
                account_id: lib.account_id,
                last_statement_balance: lib.last_statement_balance,
                minimum_payment_amount: lib.minimum_payment_amount,
                next_payment_due_date: lib.next_payment_due_date,
                last_statement_issue_date: lib.last_statement_issue_date
              });
            });
          } else {
            console.log('⚠️ No liabilities data in response - this is NORMAL for Plaid Sandbox unless using specific test credentials');
            console.log('To get statement balance and due dates in sandbox, use these credentials:');
            console.log('Username: user_good, Password: pass_good');
          }
        } else {
          const errorData = await liabilitiesResponse.json();
          console.log('⚠️ Liabilities endpoint error:', errorData);
          console.log('This endpoint may not be available for all Plaid environments or institutions');
        }
      } catch (error) {
        console.error('Error fetching liabilities (non-critical):', error);
        console.log('Statement balance and due dates will need to be entered manually');
      }
    } else {
      console.log('No credit accounts detected, skipping liabilities fetch');
    }

    // Store accounts in database - bank accounts and credit cards (for account details only)
    const bankAccountIds: string[] = [];
    const creditCardIds: string[] = [];
    
    console.log('User selected accounts:', selectedAccountIds);
    console.log('Total accounts available:', accountsData.accounts.length);
    
    for (const account of accountsData.accounts) {
      // Skip accounts that weren't selected by the user (if selectedAccountIds is provided)
      if (selectedAccountIds && !selectedAccountIds.includes(account.account_id)) {
        console.log(`Skipping unselected account: ${account.name} (${account.account_id})`);
        continue;
      }
      
      console.log(`Processing selected account: ${account.name}, type: ${account.type}, subtype: ${account.subtype}`);
      
      // Check if this is a credit card
      const isCreditCard = account.type === 'credit' || account.subtype === 'credit card' || account.subtype === 'credit';
      
      if (isCreditCard) {
        // Process credit card
        console.log('📇 Processing credit card:', account.name);
        
        // Check if this credit card already exists
        const { data: existingCard } = await supabaseAdmin
          .from('credit_cards')
          .select('id, account_name, plaid_account_id')
          .eq('account_id', accountId)
          .eq('plaid_account_id', account.account_id)
          .maybeSingle();
        
        if (existingCard) {
          console.log(`⚠️ Credit card already connected: ${existingCard.account_name} (${existingCard.id})`);
          console.log('Skipping duplicate - this card is already linked');
          continue;
        }
        
        const currentBalance = account.balances.current || 0;
        const creditLimit = account.balances.limit || 0;
        const availableCredit = creditLimit - currentBalance;
        
        // Find liabilities data for this credit card
        const cardLiabilities = liabilitiesData ? liabilitiesData.find((lib: any) => lib.account_id === account.account_id) : null;
        
        console.log('Credit card liabilities data:', cardLiabilities);
        
        // Store as credit card with encrypted access token
        const { data: cardData, error: insertError } = await supabaseAdmin
          .from('credit_cards')
          .insert({
            user_id: user.id,
            account_id: accountId,
            institution_name: metadata.institution.name,
            account_name: account.name,
            account_type: account.subtype || account.type,
            balance: currentBalance,
            credit_limit: creditLimit,
            available_credit: availableCredit,
            currency_code: account.balances.iso_currency_code || 'USD',
            encrypted_access_token: access_token,
            encrypted_plaid_item_id: item_id,
            plaid_account_id: account.account_id,
            statement_balance: cardLiabilities?.last_statement_balance || 0,
            minimum_payment: cardLiabilities?.minimum_payment_amount || 0,
            payment_due_date: cardLiabilities?.next_payment_due_date || null,
            statement_close_date: cardLiabilities?.last_statement_issue_date || null,
            last_sync: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting credit card:', insertError);
          throw insertError;
        }
        
        creditCardIds.push(cardData.id);
        console.log('✅ Credit card stored successfully:', cardData.id);
      } else {
        // Process bank account
        console.log('🏦 Processing bank account:', account.name);
        
        // Check if this bank account already exists
        const { data: existingAccount } = await supabaseAdmin
          .from('bank_accounts')
          .select('id, account_name, plaid_account_id')
          .eq('account_id', accountId)
          .eq('plaid_account_id', account.account_id)
          .maybeSingle();
        
        if (existingAccount) {
          console.log(`⚠️ Bank account already connected: ${existingAccount.account_name} (${existingAccount.id})`);
          console.log('Skipping duplicate - this account is already linked');
          continue;
        }
        
        const currentBalance = account.balances.current || 0;
        const now = new Date().toISOString();
        
        // Store as bank account with encrypted access token
        const { data: accountData, error: insertError } = await supabaseAdmin
          .from('bank_accounts')
          .insert({
            user_id: user.id,
            account_id: accountId,
            institution_name: metadata.institution.name,
            account_name: account.name,
            account_type: account.subtype || account.type,
            balance: currentBalance,
            available_balance: account.balances.available,
            currency_code: account.balances.iso_currency_code || 'USD',
            encrypted_access_token: access_token,
            encrypted_plaid_item_id: item_id,
            plaid_account_id: account.account_id,
            initial_balance: currentBalance,
            initial_balance_date: now,
            last_sync: now,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting bank account:', insertError);
          throw insertError;
        }
        
        bankAccountIds.push(accountData.id);
        console.log('✅ Bank account stored successfully:', accountData.id);
      }
    }

    console.log('Successfully stored accounts:', { 
      bankAccounts: bankAccountIds.length,
      creditCards: creditCardIds.length 
    });

    // Sync transactions ONLY for bank accounts (credit cards don't support transaction sync)
    console.log('🔄 Starting transaction sync for bank accounts...');
    
    const syncResults = {
      bankAccounts: { success: 0, failed: 0 }
    };

    // Sync bank accounts only
    for (const accountId of bankAccountIds) {
      try {
        console.log('Starting transaction sync for bank account:', accountId);
        const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-plaid-transactions', {
          body: { accountId, isInitialSync: true, accountType: 'bank' },
        });
        if (syncError) {
          console.error(`Failed to sync transactions for bank account ${accountId}:`, syncError);
          syncResults.bankAccounts.failed++;
        } else {
          console.log(`✅ Successfully synced transactions for bank account ${accountId}:`, syncData);
          syncResults.bankAccounts.success++;
        }
      } catch (error) {
        console.error(`Error syncing transactions for bank account ${accountId}:`, error);
        syncResults.bankAccounts.failed++;
      }
    }

    console.log('📊 Transaction sync complete:', syncResults);

    const totalSynced = syncResults.bankAccounts.success;
    const totalFailed = syncResults.bankAccounts.failed;
    const totalAccounts = bankAccountIds.length + creditCardIds.length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        bankAccountIds,
        creditCardIds,
        transactionsSynced: totalSynced,
        transactionsFailed: totalFailed,
        message: `Successfully connected ${totalAccounts} account(s) (${bankAccountIds.length} bank, ${creditCardIds.length} credit cards) and synced ${totalSynced} transaction histories` 
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
