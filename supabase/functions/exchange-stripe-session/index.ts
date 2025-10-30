import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXCHANGE-STRIPE-SESSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the session to get connected accounts
    const session = await stripe.financialConnections.sessions.retrieve(sessionId);
    logStep("Retrieved session", { accountIds: session.accounts?.data?.length || 0 });

    const accounts = [];

    // Process each connected account - ONLY bank accounts (skip credit cards)
    for (const account of session.accounts?.data || []) {
      const fullAccount = await stripe.financialConnections.accounts.retrieve(account.id);
      logStep("Processing account", { accountId: fullAccount.id, type: fullAccount.subcategory });

      // Skip credit cards - only process bank accounts
      const isCredit = fullAccount.subcategory === 'credit_card';
      if (isCredit) {
        logStep("Skipping credit card (not supported)", { name: fullAccount.display_name });
        continue;
      }

      // Get user's account_id from profile
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .single();
      
      if (profileError || !profile?.account_id) {
        throw new Error('User profile or account_id not found');
      }

      const accountData = {
        user_id: user.id,
        account_id: profile.account_id,
        institution_name: fullAccount.institution_name,
        account_name: fullAccount.display_name || fullAccount.last4 || 'Account',
        account_type: fullAccount.subcategory || 'checking',
        balance: fullAccount.balance?.current ? fullAccount.balance.current / 100 : 0,
        available_balance: fullAccount.balance?.available ? fullAccount.balance.available / 100 : null,
        currency_code: fullAccount.balance?.currency?.toUpperCase() || 'USD',
        plaid_account_id: fullAccount.id,
        encrypted_access_token: null,
        encrypted_account_number: fullAccount.last4 || null,
        encrypted_plaid_item_id: null,
        initial_balance: fullAccount.balance?.current ? fullAccount.balance.current / 100 : 0,
        initial_balance_date: new Date().toISOString(),
        last_sync: new Date().toISOString(),
      };

      // Insert into bank_accounts table
      const { data, error } = await supabaseClient
        .from('bank_accounts')
        .insert(accountData)
        .select()
        .single();

      if (error) {
        logStep("Error inserting bank account", { error: error.message });
        throw error;
      }
      
      accounts.push({ ...data, type: 'bank_account' });
      logStep("Bank account stored successfully", { id: data.id });
    }

    logStep("Successfully processed accounts", { count: accounts.length });

    // Sync transactions for all bank accounts
    logStep("Starting transaction sync for bank accounts");
    const syncResults = { success: 0, failed: 0 };
    
    for (const account of accounts) {
      try {
        logStep("Syncing transactions for account", { accountId: account.id });
        const { data: syncData, error: syncError } = await supabaseClient.functions.invoke('sync-stripe-transactions', {
          body: { accountId: account.id, isInitialSync: true },
        });
        
        if (syncError) {
          logStep("Failed to sync transactions", { accountId: account.id, error: syncError.message });
          syncResults.failed++;
        } else {
          logStep("Successfully synced transactions", { accountId: account.id, count: syncData?.count || 0 });
          syncResults.success++;
        }
      } catch (error) {
        logStep("Error syncing transactions", { accountId: account.id, error: error instanceof Error ? error.message : String(error) });
        syncResults.failed++;
      }
    }

    logStep("Transaction sync complete", syncResults);

    return new Response(
      JSON.stringify({ 
        accounts, 
        transactionsSynced: syncResults.success,
        transactionsFailed: syncResults.failed,
        message: `Connected ${accounts.length} account(s) and synced ${syncResults.success} transaction histories`
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
