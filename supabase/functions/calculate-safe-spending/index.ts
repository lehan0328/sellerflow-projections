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

    // Get data for next 180 days
    const today = new Date();
    const next180Days = new Date();
    next180Days.setDate(today.getDate() + 180);

    // Fetch income data
    const { data: income } = await supabaseClient
      .from('income')
      .select('amount, payment_date, status')
      .eq('user_id', user.id)
      .gte('payment_date', today.toISOString())
      .lte('payment_date', next180Days.toISOString());

    // Fetch expense data (transactions)
    const { data: expenses } = await supabaseClient
      .from('transactions')
      .select('amount, transaction_date, status')
      .eq('user_id', user.id)
      .gte('transaction_date', today.toISOString())
      .lte('transaction_date', next180Days.toISOString());

    // Fetch vendor payments
    const { data: vendors } = await supabaseClient
      .from('vendors')
      .select('next_payment_amount, next_payment_date, status')
      .eq('user_id', user.id)
      .gte('next_payment_date', today.toISOString())
      .lte('next_payment_date', next180Days.toISOString());

    // Fetch Amazon payouts (include forecasted payouts as confirmed income)
    const { data: amazonPayouts } = await supabaseClient
      .from('amazon_payouts')
      .select('total_amount, payout_date, status')
      .eq('user_id', user.id)
      .gte('payout_date', today.toISOString())
      .lte('payout_date', next180Days.toISOString());

    // Get current bank balance
    const { data: settings } = await supabaseClient
      .from('user_settings')
      .select('total_cash')
      .eq('user_id', user.id)
      .single();

    // Calculate totals - include ALL Amazon payouts (confirmed AND forecasted)
    const totalIncome = (income || []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalAmazonIncome = (amazonPayouts || []).reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalVendorPayments = (vendors || []).reduce((sum, v) => sum + (Number(v.next_payment_amount) || 0), 0);
    
    const currentBalance = Number(settings?.total_cash || 0);
    const projectedIncome = totalIncome + totalAmazonIncome; // Includes forecasted payouts
    const projectedExpenses = totalExpenses + totalVendorPayments;
    const projectedBalance = currentBalance + projectedIncome - projectedExpenses;

    // Use AI to calculate safe spending limit
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a financial advisor analyzing cash flow data for the next 180 days.

Current Balance: $${currentBalance.toFixed(2)}
Projected Income (180 days): $${projectedIncome.toFixed(2)}
Projected Expenses (180 days): $${projectedExpenses.toFixed(2)}
Projected End Balance: $${projectedBalance.toFixed(2)}

Number of income transactions: ${(income?.length || 0) + (amazonPayouts?.length || 0)}
Number of expense transactions: ${(expenses?.length || 0) + (vendors?.length || 0)}

Based on this data, calculate a conservative "safe spending limit" - the maximum amount the user can safely spend per day without risking cash flow issues. Consider:
1. Current cash reserves
2. Income consistency
3. Upcoming expenses
4. A safety buffer (at least 20% of projected balance)

Return ONLY a JSON object with this exact structure:
{
  "safe_daily_limit": <number>,
  "total_180day_limit": <number>,
  "confidence_level": "high|medium|low",
  "reasoning": "<brief 1-2 sentence explanation>"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a financial advisor. Return only valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    // Parse AI response
    let aiResult;
    try {
      aiResult = JSON.parse(aiContent);
    } catch {
      // Fallback calculation if AI parsing fails
      const dailyAverage = projectedBalance / 180;
      const safeDaily = Math.max(0, dailyAverage * 0.7); // 70% safety margin
      aiResult = {
        safe_daily_limit: safeDaily,
        total_180day_limit: safeDaily * 180,
        confidence_level: "medium",
        reasoning: "Calculated with 30% safety buffer based on projected balance."
      };
    }

    return new Response(
      JSON.stringify({
        safe_daily_limit: aiResult.safe_daily_limit,
        total_180day_limit: aiResult.total_180day_limit,
        confidence_level: aiResult.confidence_level,
        reasoning: aiResult.reasoning,
        projection_data: {
          current_balance: currentBalance,
          projected_income: projectedIncome,
          projected_expenses: projectedExpenses,
          projected_balance: projectedBalance,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error calculating safe spending:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
