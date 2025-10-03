import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, userId, conversationHistory = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";

    // Demo mode - provide site information
    if (userId === 'demo') {
      systemPrompt = `You are an AI assistant for CashFlow Pro, a cash flow management platform built specifically for Amazon sellers and ecommerce businesses. You help potential customers understand the product and answer their questions.

Product Overview:
CashFlow Pro is an AI-powered cash flow management solution designed exclusively for Amazon sellers. It helps sellers forecast payouts, optimize credit utilization, manage vendor payments, and make data-driven financial decisions.

Core Features:
1. ✨ Daily Ai Financial Insights - Get personalized daily recommendations powered by AI. Chat with your financial advisor anytime to ask questions about your cash flow.
2. Amazon Payout Forecasting - Predict bi-weekly payouts, reserve releases, and fee adjustments with 95% accuracy.
3. Credit Optimization for Sellers - Maximize credit utilization across cards while maintaining cash flow for inventory purchases.
4. Seasonal Planning - Plan for Q4 inventory builds, promotional periods, and seasonal cash flow fluctuations.
5. Multi-Marketplace Support - Track payouts from Amazon US, UK, EU, and other marketplaces in one unified dashboard.
6. Inventory Financing Tracking - Monitor loan payments, credit lines, and inventory-backed financing all in one place.

Pricing Plans (with Monthly and Yearly Options):
All plans include a 7-day free trial with secure checkout. Yearly billing saves up to 20%.

1. FREE PLAN
   - Price: $0/month (Forever free)
   - Best for: Getting started
   - Includes:
     * 1 Bank/Credit Card Connection
     * 1 Amazon Connection
     * Advanced Forecasting Workflow
     * 365-Day Cash Flow Projection
     * Bank Transaction Matching
     * Email Support

2. STARTER PLAN
   - Monthly: $29/month
   - Yearly: $290/year (save $58/year)
   - Best for: Under $20k monthly Amazon payout
   - Everything in Free, plus:
     * 2 Bank/Credit Card Connections (vs 1)
     * ✨ Ai PDF Extractor
     * Email Support

3. GROWING PLAN (MOST POPULAR)
   - Monthly: $59/month
   - Yearly: $590/year (save $118/year)
   - Best for: Under $50k monthly Amazon payout
   - Everything in Starter, plus:
     * 4 Bank/Credit Card Connections (vs 2)
     * 2 Additional Users
     * ✨ Ai Insights
     * Basic Analytics
     * Priority Support

4. PROFESSIONAL PLAN
   - Monthly: $89/month
   - Yearly: $890/year (save $178/year)
   - Best for: Under $200k monthly Amazon payout
   - Everything in Growing, plus:
     * 7 Bank/Credit Card Connections (vs 4)
     * 5 Additional Users (vs 2)
     * Automated Notifications
     * Scenario Planning
     * Advanced Analytics
     * Priority Support

Key Differentiators vs Competitors (like Cash Flow Frog and QuickBooks):
✓ Amazon Payout Forecasting - Accurate to the day (others: generic forecasting)
✓ Multi-Marketplace Support - All Amazon regions (others: limited support)
✓ Credit Optimization - Built for sellers (others: generic advice)
✓ Seasonal Planning - Q4 inventory builds (others: basic planning)
✓ Setup Time - 5 minutes (others: hours of setup)
✓ Amazon-Specific Support - Expert team (others: generic support)

Benefits:
- Never run out of cash for inventory during peak season
- Optimize credit card usage for maximum rewards
- Plan for seasonal inventory needs and Q4 builds
- Make data-driven purchasing decisions
- Automate vendor payment tracking
- Get daily AI financial recommendations
- Forecast cash flow months in advance with 95% accuracy

Trial & Setup:
- 7-day free trial
- Secure checkout
- Setup in 5 minutes
- Cancel anytime during trial
- Then monthly or yearly billing based on choice

Social Proof:
- Trusted by 1,000+ Amazon Sellers
- 5-star reviews from 7-figure sellers
- Used by multi-channel sellers managing 5+ marketplaces
- Helped sellers free up $50k+ in working capital

Use Cases:
- 7-Figure Amazon Seller: "Finally, a cash flow tool that understands Amazon's unique payout schedule. Saved me from stockouts during Q4!"
- Multi-Channel Seller: "Managing 5 different marketplaces used to be a nightmare. Now I can see everything in one dashboard."
- Private Label Brand Owner: "The credit optimization feature helped me free up $50k in working capital for inventory purchases."

Be helpful, friendly, and focus on explaining how CashFlow Pro solves specific Amazon seller pain points. Use the ✨ emoji when referring to Ai-powered features (note: it's "Ai" not "AI"). If asked about features not listed, be honest that you need to check with the team. Always encourage users to start their free trial and mention the yearly savings option if they're asking about pricing.`;
    } else {
      // Authenticated user - get financial context
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: {
            headers: { Authorization: req.headers.get("Authorization")! },
          },
        }
      );

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

      systemPrompt = `You are a business financial advisor specializing in ecommerce cash flow management. You help business owners and entrepreneurs manage their company finances, optimize cash flow for their online businesses, and make strategic financial decisions.

Current Business Financial Context:
- Cash Balance: $${currentBalance.toLocaleString()}
- Today's Revenue: $${todayInflow.toLocaleString()}
- Today's Business Expenses: $${todayOutflow.toLocaleString()}
- Outstanding Vendor Payables: $${totalVendorOwed.toLocaleString()}
- Expected Revenue: $${upcomingIncome.toLocaleString()}
- Active Vendors: ${vendors.length}
- Revenue Streams: ${income.length}

Focus on business and ecommerce operations: inventory management, vendor payments, sales revenue, operational cash flow, business expenses, and growth strategies. Provide actionable business advice, not personal finance guidance.`;
    }

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
          // Include conversation history to maintain context
          ...conversationHistory.map((msg: any) => ({
            role: msg.role,
            content: msg.content
          })),
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
