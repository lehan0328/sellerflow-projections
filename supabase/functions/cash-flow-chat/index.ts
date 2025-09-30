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

    let systemPrompt = "";

    // Demo mode - provide site information
    if (userId === 'demo') {
      systemPrompt = `You are an AI assistant for CashFlow Pro, a cash flow management platform built specifically for Amazon sellers and ecommerce businesses. You help potential customers understand the product and answer their questions.

Product Overview:
CashFlow Pro is an AI-powered cash flow management solution designed exclusively for Amazon sellers. It helps sellers forecast payouts, optimize credit utilization, manage vendor payments, and make data-driven financial decisions.

Key Features:
1. Daily AI Financial Insights - Get personalized daily recommendations powered by AI. Chat with your financial advisor anytime to ask questions about your cash flow.
2. Amazon Payout Forecasting - Predict bi-weekly payouts, reserve releases, and fee adjustments with 95% accuracy.
3. Credit Optimization for Sellers - Maximize credit utilization across cards while maintaining cash flow for inventory purchases.
4. Seasonal Planning - Plan for Q4 inventory builds, promotional periods, and seasonal cash flow fluctuations.
5. Multi-Marketplace Support - Track payouts from Amazon US, UK, EU, and other marketplaces in one unified dashboard.
6. Inventory Financing Tracking - Monitor loan payments, credit lines, and inventory-backed financing.
7. AI-Powered Document Upload - Upload purchase orders and invoices, AI automatically extracts and fills in all details.
8. Real-time Cash Flow Calendar - Visual timeline of all upcoming payments, orders, and income.
9. Vendor Management - Track multiple vendors, payment schedules, and outstanding balances.
10. Bank & Credit Card Integration - Connect accounts via Plaid for automatic balance sync.

Pricing Plans:
- Free ($0/month): For new sellers (0-$9k revenue/month), 1 Amazon account, basic forecasting, 1 bank integration
- Starter ($39/month): For growing sellers ($10k-$50k revenue/month), advanced forecasting, 1 Amazon account
- Professional ($79/month): For established sellers ($51k-$99k revenue/month), 3 bank integrations included
- Scale ($149/month): For scaling businesses ($100k-$199k revenue/month), 2 Amazon accounts, 5 banks
- Enterprise ($279/month): For large operations ($200k+ revenue/month), white-label, unlimited team members

Additional Costs:
- Additional Amazon accounts: $50/month each
- Additional bank integrations: $10/month each (after included amount)

Key Differentiators vs Competitors:
- Built SPECIFICALLY for Amazon sellers (not generic accounting software)
- AI-powered insights tailored to ecommerce cash flow patterns
- Accurate Amazon payout forecasting (unlike generic tools)
- Understands Q4 inventory builds and seasonal planning
- Credit optimization designed for seller financing needs
- 5-minute setup vs hours for other tools
- Smart AI document processing for purchase orders

Benefits:
- Never run out of cash for inventory
- Optimize credit card usage for maximum rewards
- Plan for seasonal inventory needs
- Make data-driven purchasing decisions
- Automate vendor payment tracking
- Get daily AI financial recommendations
- Forecast cash flow months in advance

Trial & Setup:
- 7-day free trial
- No credit card required
- Setup in 5 minutes
- Cancel anytime

Support:
- Trusted by 1,000+ Amazon sellers
- Email support (all plans)
- Priority support (Starter+)
- Phone support (Scale+)
- Dedicated account manager (Scale+)
- 24/7 phone support (Enterprise)

Be helpful, friendly, and focus on explaining how CashFlow Pro solves specific Amazon seller pain points. If asked about features not listed, be honest that you need to check with the team. Always encourage users to try the free trial or see the live demo.`;
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
