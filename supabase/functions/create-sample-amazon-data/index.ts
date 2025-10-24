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
    console.log('[SAMPLE] Function invoked');
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    console.log('[SAMPLE] Getting authenticated user...');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      console.error('[SAMPLE] Auth error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    if (!user) {
      console.error('[SAMPLE] No user found');
      throw new Error("Not authenticated");
    }

    console.log('[SAMPLE] User authenticated:', user.id);

    // Get user's account_id and last sample data generation time
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('account_id, last_sample_data_generated')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('[SAMPLE] Profile error:', profileError);
      throw new Error(`Failed to get profile: ${profileError.message}`);
    }

    if (!profile?.account_id) {
      console.error('[SAMPLE] No account_id in profile');
      throw new Error("Account not found");
    }

    // Check 3-hour rate limit (180 minutes)
    if (profile.last_sample_data_generated) {
      const lastGenerated = new Date(profile.last_sample_data_generated);
      const now = new Date();
      const hoursSinceLastGeneration = (now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastGeneration < 3) {
        const remainingMinutes = Math.ceil((3 - hoursSinceLastGeneration) * 60);
        const remainingHours = Math.floor(remainingMinutes / 60);
        const remainingMins = remainingMinutes % 60;
        
        console.log('[SAMPLE] Rate limit hit:', {
          lastGenerated: lastGenerated.toISOString(),
          hoursSince: hoursSinceLastGeneration,
          remainingMinutes
        });
        
        throw new Error(`Please wait ${remainingHours}h ${remainingMins}m before generating sample data again. Last generated: ${lastGenerated.toLocaleString()}`);
      }
    }

    const accountId = profile.account_id;
    console.log('[SAMPLE] Account ID:', accountId);

    // Check if sample account already exists
    const { data: existing } = await supabaseClient
      .from('amazon_accounts')
      .select('id')
      .eq('seller_id', 'SAMPLE123456')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      console.log('[SAMPLE] Sample account already exists, deleting old data...');
      
      // Delete old sample data
      await supabaseClient
        .from('amazon_accounts')
        .delete()
        .eq('id', existing.id);
      
      console.log('[SAMPLE] Old sample data deleted');
    }

    console.log('[SAMPLE] Creating sample Amazon account...');

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
        last_synced_to: new Date().toISOString(),
        sync_status: 'idle',
        initial_sync_complete: true,
      })
      .select()
      .single();

    if (accountError) {
      console.error('[SAMPLE] Error creating Amazon account:', accountError);
      throw new Error(`Failed to create Amazon account: ${accountError.message}`);
    }

    console.log('[SAMPLE] Amazon account created:', amazonAccount.id);

    // Generate 6 months of historical payout data
    const payouts = [];
    const transactions = [];
    const today = new Date();
    
    console.log('[SAMPLE] Generating 12 payouts with transactions...');
    
    for (let i = 0; i < 12; i++) {
      const payoutDate = new Date(today);
      payoutDate.setDate(payoutDate.getDate() - (i * 14)); // Bi-weekly
      
      // Randomize payout amounts between $50,000 - $99,000 (5-figure range)
      const ordersTotal = Math.floor(Math.random() * 49000) + 50000;
      const feesTotal = Math.floor(ordersTotal * 0.15); // 15% fees
      const refundsTotal = Math.floor(Math.random() * 2000) + 500;
      const totalAmount = ordersTotal - feesTotal - refundsTotal;

      const settlementId = `SETTLEMENT-${i + 1}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      payouts.push({
        user_id: user.id,
        account_id: accountId,
        amazon_account_id: amazonAccount.id,
        settlement_id: settlementId,
        payout_date: payoutDate.toISOString().split('T')[0],
        total_amount: totalAmount,
        orders_total: ordersTotal,
        fees_total: -feesTotal,
        refunds_total: -refundsTotal,
        other_total: 0,
        transaction_count: Math.floor(Math.random() * 100) + 150,
        status: 'confirmed',
        currency_code: 'USD',
        marketplace_name: 'Amazon.com',
        payout_type: 'bi-weekly',
      });

      // Generate sample transactions for this payout with realistic data
      const numTransactions = Math.floor(Math.random() * 100) + 150;
      for (let j = 0; j < numTransactions; j++) {
        const transactionDate = new Date(payoutDate);
        transactionDate.setDate(transactionDate.getDate() - Math.floor(Math.random() * 14));
        
        // Calculate delivery date (2-4 days after order)
        const deliveryDate = new Date(transactionDate);
        deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 3) + 2);
        
        const isOrder = Math.random() > 0.3;
        const grossAmount = isOrder 
          ? Math.floor(Math.random() * 300) + 50
          : 0;
        
        // Calculate realistic costs for orders
        const shippingCost = isOrder ? Math.random() * 8 + 2 : 0;
        const adsCost = isOrder ? grossAmount * (Math.random() * 0.15) : 0;
        const fees = isOrder ? grossAmount * 0.15 : -Math.floor(Math.random() * 30) - 5;
        const returnRate = 0.01 + Math.random() * 0.04;
        const chargebackRate = 0.002 + Math.random() * 0.008;
        const netAmount = isOrder ? (grossAmount - fees - shippingCost - adsCost) : fees;

        transactions.push({
          user_id: user.id,
          account_id: accountId,
          amazon_account_id: amazonAccount.id,
          settlement_id: settlementId,
          transaction_id: `TXN-${i}-${j}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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

    console.log('[SAMPLE] Generated', payouts.length, 'payouts and', transactions.length, 'transactions');
    console.log('[SAMPLE] Inserting payouts...');

    // Insert payouts
    const { error: payoutsError } = await supabaseClient
      .from('amazon_payouts')
      .insert(payouts);

    if (payoutsError) {
      console.error('[SAMPLE] Error inserting payouts:', payoutsError);
      throw new Error(`Failed to insert payouts: ${payoutsError.message}`);
    }

    console.log('[SAMPLE] ✓ Payouts inserted');
    console.log('[SAMPLE] Inserting', transactions.length, 'transactions in batches...');

    // Insert transactions in batches
    const batchSize = 100;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const { error: txError } = await supabaseClient
        .from('amazon_transactions')
        .insert(batch);
      
      if (txError) {
        console.error(`[SAMPLE] Error inserting batch ${i}-${i+batchSize}:`, txError);
        throw new Error(`Failed to insert transactions batch: ${txError.message}`);
      }
      
      console.log(`[SAMPLE] ✓ Inserted batch ${Math.min(i + batchSize, transactions.length)}/${transactions.length}`);
    }

    console.log('[SAMPLE] ✓ All data inserted successfully');

    // Update last_sample_data_generated timestamp
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ last_sample_data_generated: new Date().toISOString() })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[SAMPLE] Error updating profile timestamp:', updateError);
      // Don't throw - data was created successfully
    } else {
      console.log('[SAMPLE] ✓ Updated rate limit timestamp');
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
    console.error("[SAMPLE] Error creating sample data:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
