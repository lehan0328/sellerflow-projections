import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log("Fetching data for user:", user.id);

    // Fetch user's vendors directly from database
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', user.id);

    if (vendorsError) {
      console.error("Error fetching vendors:", vendorsError);
      throw new Error("Failed to fetch vendors");
    }

    // Fetch user's income directly from database
    const { data: income, error: incomeError } = await supabase
      .from('income')
      .select('*')
      .eq('user_id', user.id);

    if (incomeError) {
      console.error("Error fetching income:", incomeError);
      throw new Error("Failed to fetch income");
    }

    // Fetch user's actual cash balance from user_settings (this is the authoritative source)
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('total_cash')
      .eq('user_id', user.id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error("Error fetching user settings:", settingsError);
      throw new Error("Failed to fetch user settings");
    }

    // Use total_cash from user_settings as the current balance (this matches the dashboard)
    const currentBalance = Number(userSettings?.total_cash || 0);

    console.log("Starting cash flow analysis with:", {
      currentBalance,
      vendorsCount: vendors?.length || 0,
      incomeCount: income?.length || 0,
      userId: user.id
    });

    // Calculate future cash flow projections (180 days)
    const projections = [];
    let runningBalance = currentBalance || 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i <= 180; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      targetDate.setHours(0, 0, 0, 0);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      let dayInflow = 0;
      let dayOutflow = 0;
      
      // Calculate expected income for this date (only pending income that becomes received)
      const dayIncome = (income || []).filter((item: any) => {
        if (!item.payment_date || item.status !== 'pending') return false;
        const incomeDate = new Date(item.payment_date);
        incomeDate.setHours(0, 0, 0, 0);
        return incomeDate.getTime() === targetDate.getTime();
      });
      dayInflow = dayIncome.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
      
      // Calculate expected expenses for this date (only vendors with amounts owed)
      const dayVendors = (vendors || []).filter((vendor: any) => {
        if (!vendor.next_payment_date || (vendor.total_owed || 0) <= 0) return false;
        const vendorDate = new Date(vendor.next_payment_date);
        vendorDate.setHours(0, 0, 0, 0);
        return vendorDate.getTime() === targetDate.getTime();
      });
      dayOutflow = dayVendors.reduce((sum: number, vendor: any) => sum + (Number(vendor.total_owed) || 0), 0);
      
      // Update running balance
      runningBalance = runningBalance + dayInflow - dayOutflow;
      
      // Store projections for days with activity or when negative
      if (dayInflow > 0 || dayOutflow > 0 || runningBalance < 0) {
        projections.push({
          date: dateStr,
          balance: runningBalance,
          inflow: dayInflow,
          outflow: dayOutflow,
          daysFromNow: i
        });
      }
    }
    
    console.log("Generated projections:", {
      totalProjections: projections.length,
      firstNegative: projections.find(p => p.balance < 0)
    });
    
    // Find when balance goes negative
    const goesNegative = projections.find(p => p.balance < 0);
    const daysUntilNegative = goesNegative ? goesNegative.daysFromNow : null;
    
    // Calculate total upcoming income vs expenses
    const totalUpcomingIncome = (income || [])
      .filter((item: any) => item.status === 'pending')
      .reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    
    const totalUpcomingExpenses = (vendors || [])
      .filter((vendor: any) => (vendor.total_owed || 0) > 0)
      .reduce((sum: number, vendor: any) => sum + (Number(vendor.total_owed) || 0), 0);
    
    // Calculate safe spending power based on actual projections
    const lowestBalance = projections.length > 0 
      ? Math.min(...projections.map(p => p.balance)) 
      : currentBalance;
    const lowestBalanceDay = projections.find(p => p.balance === lowestBalance);
    
    // Safe spending is: current balance minus the lowest projected balance minus 10% buffer
    const safetyBuffer = currentBalance * 0.1;
    const spendingPower = Math.max(0, currentBalance - Math.abs(currentBalance - lowestBalance) - safetyBuffer);

    const systemPrompt = `You are a business cash flow advisor analyzing a business's financial data and future projections. Provide concise, actionable BUSINESS advice focused on operations, vendor relationships, and business growth. This is a BUSINESS-ONLY tool - do NOT provide personal finance advice.

IMPORTANT FORMATTING RULES:
- Start with "**Current Financial Health:**" followed by your business health assessment
- Add "**Lowest Balance Alert:**" showing when balance will be at its lowest point (MUST include exact day count and amount)
- Add "**Safe Spending Power:**" with the calculated amount and EXPLAIN THE CALCULATION: "This is your current balance ($${currentBalance.toLocaleString()}) minus the projected drop ($${Math.abs(currentBalance - lowestBalance).toLocaleString()}) minus a 10% safety buffer ($${safetyBuffer.toLocaleString()}) = $${spendingPower.toLocaleString()} available for new business expenses."
- Add "**Future Outlook:**" with business projection analysis (CRITICAL if going negative)
- End with "**Actionable Recommendation:**" followed by one specific business action they should take
- Keep total response under 300 words
- ALWAYS mention the lowest balance day count and amount prominently
- ALWAYS explain how Safe Spending Power relates to Lowest Balance Alert with the actual numbers

Focus on:
- Business cash position and operational runway
- Vendor payment timing and relationship management
- Business spending priorities and operational decisions
- Working capital optimization for business operations
- Risk warnings specific to business continuity
- Never mention personal savings, personal expenses, or personal financial advice`;

    let projectionSummary = "";
    if (goesNegative) {
      const formattedDate = new Date(goesNegative.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      projectionSummary = `⚠️ CRITICAL: Balance projected to go NEGATIVE in ${daysUntilNegative} days (${formattedDate}). Balance will drop to $${goesNegative.balance.toLocaleString()}.`;
    } else if (projections.length > 0 && lowestBalanceDay) {
      const formattedDate = new Date(lowestBalanceDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      projectionSummary = `📊 Lowest Balance: $${lowestBalance.toLocaleString()} occurring in ${lowestBalanceDay.daysFromNow} days (${formattedDate}). Will stay positive for next 180 days.`;
    } else {
      projectionSummary = `No significant cash flow changes projected in the next 180 days.`;
    }

    const userPrompt = `Current Balance: $${currentBalance.toLocaleString()}
Upcoming Income (Total): $${totalUpcomingIncome.toLocaleString()}
Upcoming Expenses (Total): $${totalUpcomingExpenses.toLocaleString()}

PROJECTION ANALYSIS (Next 180 Days):
${projectionSummary}

SAFE SPENDING CALCULATION BREAKDOWN:
- Current Balance: $${currentBalance.toLocaleString()}
- Projected Drop: $${Math.abs(currentBalance - lowestBalance).toLocaleString()} (difference between current and lowest balance)
- Safety Buffer (10%): $${safetyBuffer.toLocaleString()}
- Safe Spending Power: $${spendingPower.toLocaleString()}

Formula: Current Balance - Projected Drop - Safety Buffer = Safe Spending Power

CRITICAL: You MUST explain this Safe Spending Power calculation in your response showing how it relates to the Lowest Balance Alert. Include the exact numbers in your explanation. Mention the lowest balance day count (${lowestBalanceDay?.daysFromNow || 'N/A'} days) and amount ($${lowestBalance.toLocaleString()}).

Analyze this cash flow and provide guidance.`;

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
          { role: "user", content: userPrompt },
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
    const advice = data.choices?.[0]?.message?.content || "Unable to generate advice at this time.";

    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cash-flow-advice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
