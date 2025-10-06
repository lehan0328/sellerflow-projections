import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-STRIPE-TRANSACTIONS] ${step}${detailsStr}`);
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

    const { accountId, bankAccountId } = await req.json();
    if (!accountId || !bankAccountId) {
      throw new Error("Account ID and bank account ID are required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve transactions for the account
    const transactions = await stripe.financialConnections.transactions.list({
      account: accountId,
      limit: 100,
    });

    logStep("Retrieved transactions", { count: transactions.data.length });

    let insertedCount = 0;
    let updatedCount = 0;

    for (const transaction of transactions.data) {
      const transactionData = {
        user_id: user.id,
        bank_account_id: bankAccountId,
        plaid_transaction_id: transaction.id,
        name: transaction.description || 'Transaction',
        amount: Math.abs(transaction.amount) / 100, // Convert from cents and make positive
        date: new Date(transaction.transacted_at * 1000).toISOString().split('T')[0],
        pending: transaction.status === 'pending',
        currency_code: transaction.currency?.toUpperCase() || 'USD',
        merchant_name: transaction.description || null,
        category: transaction.status_transitions?.posted_at ? ['general'] : ['pending'],
        transaction_type: transaction.amount < 0 ? 'debit' : 'credit',
        payment_channel: 'other',
        raw_data: transaction,
      };

      // Check if transaction already exists
      const { data: existing } = await supabaseClient
        .from('bank_transactions')
        .select('id')
        .eq('plaid_transaction_id', transaction.id)
        .single();

      if (existing) {
        // Update existing transaction
        const { error } = await supabaseClient
          .from('bank_transactions')
          .update(transactionData)
          .eq('id', existing.id);

        if (!error) updatedCount++;
      } else {
        // Insert new transaction
        const { error } = await supabaseClient
          .from('bank_transactions')
          .insert(transactionData);

        if (!error) insertedCount++;
      }
    }

    logStep("Sync complete", { inserted: insertedCount, updated: updatedCount });

    return new Response(
      JSON.stringify({ 
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        total: transactions.data.length
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
