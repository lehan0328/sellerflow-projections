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

    // Process each connected account
    for (const account of session.accounts?.data || []) {
      const fullAccount = await stripe.financialConnections.accounts.retrieve(account.id);
      logStep("Processing account", { accountId: fullAccount.id, type: fullAccount.subcategory });

      const accountData = {
        user_id: user.id,
        institution_name: fullAccount.institution_name,
        account_name: fullAccount.display_name || fullAccount.last4 || 'Account',
        account_type: fullAccount.subcategory === 'credit_card' ? 'credit' : fullAccount.subcategory || 'checking',
        balance: fullAccount.balance?.current || 0,
        available_balance: fullAccount.balance?.available || null,
        currency_code: fullAccount.balance?.currency?.toUpperCase() || 'USD',
        plaid_account_id: fullAccount.id, // Store Stripe account ID here
        encrypted_access_token: null,
        encrypted_account_number: fullAccount.last4 || null,
        encrypted_plaid_item_id: null,
        account_id: fullAccount.id,
      };

      // Determine if it's a credit card or bank account
      const isCredit = fullAccount.subcategory === 'credit_card';

      if (isCredit) {
        // Insert into credit_cards table
        const { data, error } = await supabaseClient
          .from('credit_cards')
          .insert({
            user_id: accountData.user_id,
            institution_name: accountData.institution_name,
            account_name: accountData.account_name,
            account_type: 'credit',
            balance: accountData.balance / 100, // Convert from cents
            credit_limit: 0, // Stripe doesn't provide this directly
            available_credit: Math.abs(accountData.available_balance || 0) / 100,
            currency_code: accountData.currency_code,
            plaid_account_id: accountData.plaid_account_id,
            encrypted_access_token: null,
            encrypted_account_number: accountData.encrypted_account_number,
            encrypted_plaid_item_id: null,
          })
          .select()
          .single();

        if (error) {
          logStep("Error inserting credit card", { error: error.message });
          throw error;
        }
        accounts.push({ ...data, type: 'credit_card' });
      } else {
        // Insert into bank_accounts table
        const { data, error } = await supabaseClient
          .from('bank_accounts')
          .insert({
            user_id: accountData.user_id,
            institution_name: accountData.institution_name,
            account_name: accountData.account_name,
            account_type: accountData.account_type,
            balance: accountData.balance / 100, // Convert from cents
            available_balance: accountData.available_balance ? accountData.available_balance / 100 : null,
            currency_code: accountData.currency_code,
            plaid_account_id: accountData.plaid_account_id,
            encrypted_access_token: null,
            encrypted_account_number: accountData.encrypted_account_number,
            encrypted_plaid_item_id: null,
            account_id: accountData.account_id,
          })
          .select()
          .single();

        if (error) {
          logStep("Error inserting bank account", { error: error.message });
          throw error;
        }
        accounts.push({ ...data, type: 'bank_account' });
      }
    }

    logStep("Successfully processed accounts", { count: accounts.length });

    return new Response(
      JSON.stringify({ accounts }), 
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
