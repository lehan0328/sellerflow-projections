import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { 
      currentBalance, 
      dailyInflow, 
      dailyOutflow, 
      upcomingExpenses, 
      vendors = [],
      income = [],
      chartData 
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log("Starting cash flow analysis with:", {
      currentBalance,
      vendorsCount: vendors.length,
      incomeCount: income.length
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
      const dayIncome = income.filter((item: any) => {
        if (!item.paymentDate || item.status !== 'pending') return false;
        const incomeDate = new Date(item.paymentDate);
        incomeDate.setHours(0, 0, 0, 0);
        return incomeDate.getTime() === targetDate.getTime();
      });
      dayInflow = dayIncome.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
      
      // Calculate expected expenses for this date (only vendors with amounts owed)
      const dayVendors = vendors.filter((vendor: any) => {
        if (!vendor.nextPaymentDate || (vendor.totalOwed || 0) <= 0) return false;
        const vendorDate = new Date(vendor.nextPaymentDate);
        vendorDate.setHours(0, 0, 0, 0);
        return vendorDate.getTime() === targetDate.getTime();
      });
      dayOutflow = dayVendors.reduce((sum: number, vendor: any) => sum + (Number(vendor.totalOwed) || 0), 0);
      
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
    const totalUpcomingIncome = income
      .filter((item: any) => item.status === 'pending')
      .reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    
    const totalUpcomingExpenses = vendors
      .filter((vendor: any) => (vendor.totalOwed || 0) > 0)
      .reduce((sum: number, vendor: any) => sum + (Number(vendor.totalOwed) || 0), 0);
    
    // Calculate safe spending power (current balance + upcoming income - upcoming expenses - safety buffer)
    const safetyBuffer = currentBalance * 0.1; // 10% buffer
    const spendingPower = Math.max(0, currentBalance + totalUpcomingIncome - totalUpcomingExpenses - safetyBuffer);

    const systemPrompt = `You are a financial advisor analyzing cash flow data and future projections. Provide concise, actionable advice in a friendly tone. 

IMPORTANT FORMATTING RULES:
- Start with "**Current Financial Health:**" followed by your health assessment
- Add "**Future Outlook:**" with projection analysis (CRITICAL if going negative soon)
- Add "**Safe Spending Power:**" with the calculated amount they can safely spend
- End with "**Actionable Recommendation:**" followed by one specific action they should take
- Keep total response under 200 words
- If going negative, make this VERY CLEAR and URGENT with the EXACT day count and amount

Focus on:
- Current vs projected cash position
- When balance will go negative (if applicable)
- Safe spending amount to avoid going negative
- Risk warnings and action items`;

    let projectionSummary = "";
    if (goesNegative) {
      const formattedDate = new Date(goesNegative.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      projectionSummary = `⚠️ CRITICAL: Balance projected to go NEGATIVE in ${daysUntilNegative} days (${formattedDate}). Balance will drop to $${goesNegative.balance.toLocaleString()}.`;
    } else if (projections.length > 0) {
      const lowestBalance = Math.min(...projections.map(p => p.balance));
      const lowestDay = projections.find(p => p.balance === lowestBalance);
      projectionSummary = `Projected to stay positive for next 180 days. Lowest balance: $${lowestBalance.toLocaleString()} (in ${lowestDay?.daysFromNow} days).`;
    } else {
      projectionSummary = `No significant cash flow changes projected in the next 180 days.`;
    }

    const userPrompt = `Current Balance: $${currentBalance?.toLocaleString() || 0}
Today's Inflow: $${dailyInflow?.toLocaleString() || 0}
Today's Outflow: $${dailyOutflow?.toLocaleString() || 0}
Upcoming Income (Total): $${totalUpcomingIncome.toLocaleString()}
Upcoming Expenses (Total): $${totalUpcomingExpenses.toLocaleString()}
Safe Spending Power: $${spendingPower.toLocaleString()}

${projectionSummary}

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
