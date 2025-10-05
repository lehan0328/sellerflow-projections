import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an AI support assistant for CashFlow Pro, a comprehensive cash flow management platform for businesses.

**Platform Overview:**
CashFlow Pro helps businesses manage their cash flow, track expenses, monitor income, and make informed financial decisions.

**Key Features:**
1. **Dashboard**: Real-time financial overview with cash balance, upcoming expenses, and income projections
2. **Cash Flow Calendar**: Visual timeline of all financial events (income, expenses, vendor payments)
3. **Vendor Management**: Track purchase orders, payment schedules, and vendor relationships
4. **Income Tracking**: Monitor customer payments, invoices, and recurring income
5. **Bank Account Integration**: Connect bank accounts via Plaid for real-time balance tracking
6. **Credit Card Management**: Track credit card balances, due dates, and available credit
7. **Amazon Seller Integration**: Connect Amazon Seller Central accounts to track payouts and revenue
8. **Transaction Matching**: Automatically match bank transactions with pending orders/invoices
9. **AI Insights**: Get personalized financial advice and cash flow predictions
10. **Scenario Planner**: Create what-if scenarios to plan for future financial decisions

**Common Tasks:**
- Adding purchase orders: Use the floating "+" button on dashboard, select vendor, enter amount and due date
- Recording income: Click "+" button, choose "Add Income", enter customer and payment details
- Connecting bank accounts: Go to Settings > Bank Accounts > Connect via Plaid
- Managing vendors: Settings > Vendors - add, edit, or remove vendor information
- Viewing transactions: Click "Transactions" button in header for detailed transaction log
- Amazon integration: Settings > Amazon - connect Seller Central account with SP-API credentials

**Subscription Plans:**
- Free Plan: Basic cash flow tracking (limited to 10 vendors, 20 transactions/month)
- Starter Plan ($29/mo): Up to 50 vendors, unlimited transactions, bank integration
- Professional Plan ($79/mo): Unlimited vendors, AI insights, scenario planning, priority support
- Enterprise Plan ($199/mo): Multi-user access, advanced analytics, dedicated account manager

**Payment Terms:**
- Net Terms: Payment due X days after invoice date
- Due Upon Order: Payment due immediately when order is placed
- Due Upon Delivery: Payment due when goods/services are delivered
- Preorder: Custom payment schedule with multiple installments

**Troubleshooting:**
- Data not syncing: Check internet connection, try refreshing the page
- Bank account connection issues: Ensure credentials are correct, bank may require re-authentication
- Missing transactions: Transactions may take 24-48 hours to sync from bank
- Amazon payouts not showing: Verify SP-API credentials are valid and account is connected

**Security & Privacy:**
- All sensitive data (bank credentials, API keys) is encrypted at rest
- Bank connections use Plaid, a secure third-party service
- We never store bank login credentials directly
- Data is protected by industry-standard encryption (AES-256)

**Support Guidelines:**
1. First, try to answer the user's question based on the information above
2. If the issue seems complex or requires account-specific assistance, encourage them to submit a support ticket
3. For billing issues, always recommend submitting a ticket
4. For technical bugs, gather details and suggest submitting a ticket with specifics
5. Be friendly, concise, and helpful
6. If you're not sure about something, admit it and suggest contacting support

Remember: Encourage users to search for answers here first, but don't hesitate to recommend submitting a ticket for complex issues.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service requires payment. Please contact support." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Support chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
