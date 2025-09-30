import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user's financial context
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Fetch user's data
    const today = new Date().toISOString().split("T")[0];

    const [settingsRes, transactionsRes, vendorsRes, incomeRes] = await Promise.all([
      supabase.from("user_settings").select("total_cash").eq("user_id", userId).single(),
      supabase.from("transactions").select("*").eq("user_id", userId).gte("transaction_date", today),
      supabase.from("vendors").select("name, total_owed, next_payment_date, next_payment_amount").eq("user_id", userId),
      supabase.from("income").select("*").eq("user_id", userId).gte("payment_date", today),
    ]);

    const currentBalance = settingsRes.data?.total_cash || 0;
    const transactions = transactionsRes.data || [];
    const vendors = vendorsRes.data || [];
    const income = incomeRes.data || [];

    const todayInflow = transactions
      .filter(t => (t.type === 'customer_payment' || t.type === 'sales_order') && t.status === 'completed')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const todayOutflow = transactions
      .filter(t => (t.type === 'purchase_order' || t.type === 'vendor_payment') && t.status === 'completed')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalVendorOwed = vendors.reduce((sum, v) => sum + (Number(v.total_owed) || 0), 0);
    const upcomingIncome = income.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const systemPrompt = `You are a financial advisor with access to the user's cash flow data. Answer questions about their finances accurately and provide helpful advice. Be conversational and supportive.

Current Financial Context:
- Balance: $${currentBalance.toLocaleString()}
- Today's Income: $${todayInflow.toLocaleString()}
- Today's Expenses: $${todayOutflow.toLocaleString()}
- Total Vendor Debt: $${totalVendorOwed.toLocaleString()}
- Upcoming Income: $${upcomingIncome.toLocaleString()}
- Number of Vendors: ${vendors.length}
- Number of Income Sources: ${income.length}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Unable to generate an answer at this time.";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cash-flow-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
