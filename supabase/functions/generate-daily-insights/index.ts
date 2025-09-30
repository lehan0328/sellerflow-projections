import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log("Starting daily insights generation...");

    // Get all users
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("user_id");

    if (profilesError) throw profilesError;

    console.log(`Found ${profiles?.length || 0} users to process`);

    const today = new Date().toISOString().split("T")[0];

    // Process each user
    for (const profile of profiles || []) {
      try {
        console.log(`Processing user ${profile.user_id}...`);

        // Get user's transactions from today
        const { data: transactions } = await supabaseAdmin
          .from("transactions")
          .select("*")
          .eq("user_id", profile.user_id)
          .gte("transaction_date", today);

        // Get user settings for balance
        const { data: settings } = await supabaseAdmin
          .from("user_settings")
          .select("total_cash")
          .eq("user_id", profile.user_id)
          .single();

        // Calculate metrics
        const todayInflow = transactions?.filter(t => 
          (t.type === 'customer_payment' || t.type === 'sales_order') && t.status === 'completed'
        ).reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        const todayOutflow = transactions?.filter(t => 
          (t.type === 'purchase_order' || t.type === 'vendor_payment') && t.status === 'completed'
        ).reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        // Get upcoming expenses (next 7 days)
        const sevenDaysOut = new Date();
        sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

        const { data: upcomingTx } = await supabaseAdmin
          .from("transactions")
          .select("amount")
          .eq("user_id", profile.user_id)
          .eq("status", "pending")
          .in("type", ["purchase_order", "vendor_payment"])
          .gte("transaction_date", today)
          .lte("transaction_date", sevenDaysOut.toISOString().split("T")[0]);

        const upcomingExpenses = upcomingTx?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        // Generate AI advice
        const systemPrompt = `You are a financial advisor analyzing cash flow data. Provide concise, actionable advice in a friendly tone.

IMPORTANT FORMATTING RULES:
- Start with "**Current Financial Health:**" followed by your health assessment
- Then add "**Key Insight:**" followed by one key pattern or observation
- End with "**Actionable Recommendation:**" followed by one specific action they should take
- Keep total response under 150 words

Focus on:
- Daily cash flow health
- Spending patterns
- Risk warnings if cash is running low
- Opportunities to optimize cash flow`;

        const userPrompt = `Current Balance: $${settings?.total_cash?.toLocaleString() || 0}
Today's Inflow: $${todayInflow.toLocaleString()}
Today's Outflow: $${todayOutflow.toLocaleString()}
Upcoming Expenses (7 days): $${upcomingExpenses.toLocaleString()}

Analyze this cash flow.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI API error for user ${profile.user_id}:`, await aiResponse.text());
          continue;
        }

        const aiData = await aiResponse.json();
        const advice = aiData.choices?.[0]?.message?.content || "Unable to generate insights.";

        // Store insight in database
        const { error: insertError } = await supabaseAdmin
          .from("cash_flow_insights")
          .upsert({
            user_id: profile.user_id,
            insight_date: today,
            advice,
            current_balance: settings?.total_cash || 0,
            daily_inflow: todayInflow,
            daily_outflow: todayOutflow,
            upcoming_expenses: upcomingExpenses,
          }, {
            onConflict: "user_id,insight_date"
          });

        if (insertError) {
          console.error(`Error storing insight for user ${profile.user_id}:`, insertError);
        } else {
          console.log(`Successfully generated insight for user ${profile.user_id}`);
        }
      } catch (userError) {
        console.error(`Error processing user ${profile.user_id}:`, userError);
      }
    }

    console.log("Daily insights generation complete");

    return new Response(JSON.stringify({ success: true, processed: profiles?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-daily-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
