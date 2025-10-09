import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) throw new Error("User not authenticated");

    // Find all pending sales_order transactions
    const { data: pendingTransactions, error: txError } = await supabaseClient
      .from('transactions')
      .select('id, amount, transaction_date')
      .eq('user_id', user.id)
      .eq('type', 'sales_order')
      .eq('status', 'pending');

    if (txError) throw txError;

    // Get all income records
    const { data: incomeRecords, error: incomeError } = await supabaseClient
      .from('income')
      .select('amount, payment_date')
      .eq('user_id', user.id);

    if (incomeError) throw incomeError;

    // Find orphaned transactions (no matching income)
    const orphaned = pendingTransactions?.filter(tx => {
      return !incomeRecords?.some(income => 
        Math.abs(Number(income.amount) - Number(tx.amount)) < 0.01 &&
        income.payment_date === tx.transaction_date
      );
    }) || [];

    // Delete orphaned transactions
    if (orphaned.length > 0) {
      const orphanedIds = orphaned.map(tx => tx.id);
      
      const { error: deleteError } = await supabaseClient
        .from('transactions')
        .delete()
        .in('id', orphanedIds);

      if (deleteError) throw deleteError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: orphaned.length,
        deletedTransactions: orphaned
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error cleaning up orphaned transactions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});