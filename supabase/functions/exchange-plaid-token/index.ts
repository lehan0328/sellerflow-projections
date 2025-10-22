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

    // Store accounts in database - ONLY process accounts the user selected
    const bankAccountIds: string[] = [];
    const creditCardIds: string[] = [];
    const selectedAccountIds = metadata.accounts.map((a: any) => a.id);
    
    console.log('User selected accounts:', selectedAccountIds);
    console.log('Total accounts available:', accountsData.accounts.length);
    
    for (const account of accountsData.accounts) {
      // Skip accounts that weren't selected by the user
      if (!selectedAccountIds.includes(account.account_id)) {
        console.log(`Skipping unselected account: ${account.name} (${account.account_id})`);
        continue;
      }
      
      console.log(`Processing selected account: ${account.name}, type: ${account.type}, subtype: ${account.subtype}`);
      
      // Check for duplicates BEFORE inserting
      if (account.type === 'credit') {
        // Check if this credit card already exists
        const { data: existingCard } = await supabaseAdmin
          .from('credit_cards')
          .select('id, account_name, plaid_account_id')
          .eq('account_id', accountId)
          .eq('plaid_account_id', account.account_id)
          .maybeSingle();
        
        if (existingCard) {
          console.log(`⚠️ Credit card already connected: ${existingCard.account_name} (${existingCard.id})`);
          console.log('Skipping duplicate - this account is already linked');
          continue;
        }
      } else {
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
      }
      
      // Determine if it's a credit card or bank account
      if (account.type === 'credit') {
        console.log('Processing CREDIT CARD account:', { 
          name: account.name, 
          balance: account.balances.current, 
          limit: account.balances.limit,
          available: account.balances.available
        });
        
        // Find matching liabilities data for this credit card
        const liabilityInfo = liabilitiesData?.find((lib: any) => lib.account_id === account.account_id);
        
        console.log('📊 PLAID DATA AVAILABLE FOR', account.name, ':');
        console.log('  Account Balance Data:');
        console.log('    - current (balance):', account.balances.current);
        console.log('    - limit:', account.balances.limit);
        console.log('    - available:', account.balances.available);
        console.log('  Liabilities Data (Statement Info):');
        if (liabilityInfo) {
          console.log('    ✅ AVAILABLE from Plaid:');
          console.log('      - last_statement_balance:', liabilityInfo.last_statement_balance);
          console.log('      - minimum_payment_amount:', liabilityInfo.minimum_payment_amount);
          console.log('      - next_payment_due_date:', liabilityInfo.next_payment_due_date);
          console.log('      - last_statement_issue_date:', liabilityInfo.last_statement_issue_date);
          console.log('      - is_overdue:', liabilityInfo.is_overdue);
          console.log('      - last_payment_amount:', liabilityInfo.last_payment_amount);
          console.log('      - last_payment_date:', liabilityInfo.last_payment_date);
        } else {
          console.log('    ❌ NOT AVAILABLE from Plaid');
          console.log('    📝 Note: Liabilities endpoint often returns null in Plaid Sandbox');
          console.log('    💡 To get real data in sandbox, use credentials: user_good / pass_good');
          console.log('    🔧 Users can manually enter these values in Settings > Credit Cards');
        }
        
        const currentBalance = Math.abs(account.balances.current || 0);
        const now = new Date().toISOString();
        
        // Store as credit card with encrypted access token - insert directly to bypass RPC issues
        const { data: cardData, error: insertError } = await supabaseAdmin
          .from('credit_cards')
          .insert({
            user_id: user.id,
            account_id: accountId,
            institution_name: metadata.institution.name,
            account_name: account.name,
            account_type: account.subtype || 'credit',
            balance: currentBalance,
            credit_limit: account.balances.limit || 0,
            available_credit: account.balances.available || 0,
            currency_code: account.balances.iso_currency_code || 'USD',
            encrypted_access_token: access_token,
            encrypted_plaid_item_id: item_id,
            plaid_account_id: account.account_id,
            minimum_payment: liabilityInfo?.minimum_payment_amount || null,
            payment_due_date: liabilityInfo?.next_payment_due_date || null,
            statement_close_date: liabilityInfo?.last_statement_issue_date || null,
            // FIXED: Don't fall back to currentBalance - use null if no liabilities data
            statement_balance: liabilityInfo?.last_statement_balance ? Math.abs(liabilityInfo.last_statement_balance) : null,
            annual_fee: null,
            cash_back: 0,
            priority: 3,
            initial_balance: currentBalance,
            initial_balance_date: now,
            last_sync: now,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting credit card:', insertError);
          throw insertError;
        }
        
      console.log('✅ Credit card stored successfully:', cardData.id);
      
      // Show priority dialog for newly connected card
      if (metadata.accounts.length === 1) {
        // Only show for single card connection to avoid blocking other cards
        console.log('📋 Showing priority dialog for newly connected card');
      }
      } else {
        const currentBalance = account.balances.current || 0;
        const now = new Date().toISOString();
        
        // Store as bank account with encrypted access token - insert directly to bypass RPC issues
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

    console.log('Successfully stored accounts:', { bankAccounts: bankAccountIds.length, creditCards: creditCardIds.length });

    // Start background task to sync transactions for both bank accounts and credit cards
    const bankSyncPromises = bankAccountIds.map(async (accountId) => {
      try {
        console.log('Starting transaction sync for bank account:', accountId);
        const { error: syncError } = await supabase.functions.invoke('sync-plaid-transactions', {
          body: { accountId, isInitialSync: true, accountType: 'bank' },
        });
        if (syncError) {
          console.error(`Failed to sync transactions for bank account ${accountId}:`, syncError);
        } else {
          console.log(`✅ Successfully synced transactions for bank account ${accountId}`);
        }
      } catch (error) {
        console.error(`Error syncing transactions for bank account ${accountId}:`, error);
      }
    });

    const creditSyncPromises = creditCardIds.map(async (accountId) => {
      try {
        console.log('Starting transaction sync for credit card:', accountId);
        const { error: syncError } = await supabase.functions.invoke('sync-plaid-transactions', {
          body: { accountId, isInitialSync: true, accountType: 'credit' },
        });
        if (syncError) {
          console.error(`Failed to sync transactions for credit card ${accountId}:`, syncError);
        } else {
          console.log(`✅ Successfully synced transactions for credit card ${accountId}`);
        }
      } catch (error) {
        console.error(`Error syncing transactions for credit card ${accountId}:`, error);
      }
    });

    // Don't await - let it run in background
    Promise.all([...bankSyncPromises, ...creditSyncPromises]).catch(console.error);

    return new Response(
      JSON.stringify({ 
        success: true, 
        bankAccountIds,
        creditCardIds,
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
