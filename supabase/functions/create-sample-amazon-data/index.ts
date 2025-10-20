import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get user's account_id
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.account_id) throw new Error("Account not found");

    const accountId = profile.account_id;

    // Create sample Amazon account
    const { data: amazonAccount, error: accountError } = await supabaseClient
      .from('amazon_accounts')
      .insert({
        user_id: user.id,
        account_id: accountId,
        seller_id: 'SAMPLE123456',
        marketplace_id: 'ATVPDKIKX0DER',
        marketplace_name: 'Amazon.com',
        account_name: 'Sample Amazon Store',
        payout_frequency: 'bi-weekly',
        is_active: true,
      })
      .select()
      .single();

    if (accountError) throw accountError;

    // Generate 6 months of historical payout data
    const payouts = [];
    const transactions = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const payoutDate = new Date(today);
      payoutDate.setDate(payoutDate.getDate() - (i * 14)); // Bi-weekly
      
      // Randomize payout amounts between $5,000 - $15,000
      const ordersTotal = Math.floor(Math.random() * 10000) + 5000;
      const feesTotal = Math.floor(ordersTotal * 0.15); // 15% fees
      const refundsTotal = Math.floor(Math.random() * 500);
      const totalAmount = ordersTotal - feesTotal - refundsTotal;

      const settlementId = `SETTLEMENT-${i + 1}-${Date.now()}`;

      payouts.push({
        user_id: user.id,
        account_id: accountId,
        amazon_account_id: amazonAccount.id,
        settlement_id: settlementId,
        payout_date: payoutDate.toISOString().split('T')[0],
        total_amount: totalAmount,
        orders_total: ordersTotal,
        fees_total: feesTotal,
        refunds_total: refundsTotal,
        other_total: 0,
        transaction_count: Math.floor(Math.random() * 100) + 50,
        status: 'confirmed',
        currency_code: 'USD',
        marketplace_name: 'Amazon.com',
        payout_type: 'bi-weekly',
      });

      // Generate sample transactions for this payout with realistic data
      const numTransactions = Math.floor(Math.random() * 30) + 20;
      for (let j = 0; j < numTransactions; j++) {
        const transactionDate = new Date(payoutDate);
        transactionDate.setDate(transactionDate.getDate() - Math.floor(Math.random() * 14));
        
        // Calculate delivery date (2-4 days after order)
        const deliveryDate = new Date(transactionDate);
        deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 3) + 2);
        
        const isOrder = Math.random() > 0.3;
        const grossAmount = isOrder 
          ? Math.floor(Math.random() * 150) + 20
          : 0;
        
        // Calculate realistic costs for orders
        const shippingCost = isOrder ? Math.random() * 8 + 2 : 0;
        const adsCost = isOrder ? grossAmount * (Math.random() * 0.15) : 0; // 0-15% of gross
        const fees = isOrder ? grossAmount * 0.15 : -Math.floor(Math.random() * 30) - 5; // 15% fees or negative for FBA fees
        const returnRate = 0.01 + Math.random() * 0.04; // 1-5% return rate
        const chargebackRate = 0.002 + Math.random() * 0.008; // 0.2-1% chargeback rate
        const netAmount = isOrder ? (grossAmount - fees - shippingCost - adsCost) : fees;

        transactions.push({
          user_id: user.id,
          account_id: accountId,
          amazon_account_id: amazonAccount.id,
          settlement_id: settlementId,
          transaction_id: `TXN-${i}-${j}-${Date.now()}`,
          transaction_date: transactionDate.toISOString(),
          delivery_date: isOrder ? deliveryDate.toISOString().split('T')[0] : null,
          transaction_type: isOrder ? 'Order' : 'FBAFee',
          amount: netAmount,
          gross_amount: grossAmount,
          shipping_cost: shippingCost,
          ads_cost: adsCost,
          return_rate: returnRate,
          chargeback_rate: chargebackRate,
          currency_code: 'USD',
          marketplace_name: 'Amazon.com',
          description: isOrder ? `Sample Product Sale ${j + 1}` : `Fulfillment Fee ${j + 1}`,
          order_id: isOrder ? `ORDER-${i}-${j}` : null,
          sku: isOrder ? `SKU-${Math.floor(Math.random() * 10) + 1}` : null,
        });
      }
    }

    // Insert payouts
    const { error: payoutsError } = await supabaseClient
      .from('amazon_payouts')
      .insert(payouts);

    if (payoutsError) throw payoutsError;

    // Insert transactions in batches
    const batchSize = 100;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const { error: txError } = await supabaseClient
        .from('amazon_transactions')
        .insert(batch);
      
      if (txError) throw txError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sample Amazon data created successfully",
        data: {
          account_id: amazonAccount.id,
          payouts_created: payouts.length,
          transactions_created: transactions.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating sample data:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});