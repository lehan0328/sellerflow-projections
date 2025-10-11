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
    console.log("[NOTIFICATIONS] Starting automated notifications check");
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // Convert Sunday=0 to Sunday=7
    const currentTime = now.toTimeString().substring(0, 8); // HH:MM:SS

    console.log(`[NOTIFICATIONS] Current time: ${currentTime}, day: ${currentDay}`);

    // Get all enabled notification preferences that should run now
    const { data: preferences, error: prefError } = await supabaseAdmin
      .from('notification_preferences')
      .select('*, profiles!inner(email, first_name)')
      .eq('enabled', true)
      .lte('schedule_time', currentTime)
      .gte('schedule_time', `${String(parseInt(currentTime.split(':')[0]) - 1).padStart(2, '0')}:${currentTime.split(':')[1]}:00`);

    if (prefError) {
      console.error("[NOTIFICATIONS] Error fetching preferences:", prefError);
      throw prefError;
    }

    console.log(`[NOTIFICATIONS] Found ${preferences?.length || 0} preferences to process`);

    for (const pref of preferences || []) {
      // Check if notification should run today
      if (pref.schedule_days && !pref.schedule_days.includes(currentDay)) {
        console.log(`[NOTIFICATIONS] Skipping ${pref.notification_type} for user ${pref.user_id} - not scheduled for today`);
        continue;
      }

      // Check if already sent recently (within last hour)
      if (pref.last_sent_at) {
        const lastSent = new Date(pref.last_sent_at);
        const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSent < 1) {
          console.log(`[NOTIFICATIONS] Skipping ${pref.notification_type} for user ${pref.user_id} - already sent recently`);
          continue;
        }
      }

      console.log(`[NOTIFICATIONS] Processing ${pref.notification_type} for user ${pref.user_id}`);

      try {
        await processNotification(supabaseAdmin, pref);
        
        // Update last_sent_at
        await supabaseAdmin
          .from('notification_preferences')
          .update({ last_sent_at: now.toISOString() })
          .eq('id', pref.id);
          
        console.log(`[NOTIFICATIONS] Successfully sent ${pref.notification_type} to user ${pref.user_id}`);
      } catch (error) {
        console.error(`[NOTIFICATIONS] Error processing notification for user ${pref.user_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: preferences?.length || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[NOTIFICATIONS] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function processNotification(supabase: any, pref: any) {
  const today = new Date();
  const userId = pref.user_id;

  switch (pref.notification_type) {
    case 'low_balance':
      await checkLowBalance(supabase, userId, pref.threshold_amount);
      break;
    
    case 'payment_due':
      await checkPaymentsDue(supabase, userId, pref.advance_days);
      break;
    
    case 'income_received':
      await checkIncomeReceived(supabase, userId);
      break;
    
    case 'daily_summary':
      await sendDailySummary(supabase, userId);
      break;
    
    case 'weekly_summary':
      await sendWeeklySummary(supabase, userId);
      break;
    
    default:
      console.log(`[NOTIFICATIONS] Unknown notification type: ${pref.notification_type}`);
  }
}

async function checkLowBalance(supabase: any, userId: string, threshold: number) {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('total_cash')
    .eq('user_id', userId)
    .single();

  const currentBalance = Number(settings?.total_cash || 0);

  if (currentBalance < threshold) {
    await createNotification(supabase, {
      user_id: userId,
      notification_type: 'low_balance',
      title: '⚠️ Low Balance Alert',
      message: `Your current cash balance ($${currentBalance.toLocaleString()}) is below your threshold of $${threshold.toLocaleString()}.`,
      category: 'cash-flow',
      priority: 'high',
      amount: currentBalance
    });
  }
}

async function checkPaymentsDue(supabase: any, userId: string, advanceDays: number) {
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + advanceDays);

  // Check credit card payments
  const { data: cards } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', userId)
    .lte('payment_due_date', dueDate.toISOString().split('T')[0])
    .gte('payment_due_date', today.toISOString().split('T')[0]);

  for (const card of cards || []) {
    await createNotification(supabase, {
      user_id: userId,
      notification_type: 'payment_due',
      title: '💳 Payment Due Soon',
      message: `${card.account_name} payment of $${card.minimum_payment?.toLocaleString()} is due on ${card.payment_due_date}`,
      category: 'credit',
      priority: 'high',
      amount: card.minimum_payment,
      due_date: card.payment_due_date
    });
  }

  // Check vendor payments
  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', userId)
    .lte('next_payment_date', dueDate.toISOString().split('T')[0])
    .gte('next_payment_date', today.toISOString().split('T')[0]);

  for (const vendor of vendors || []) {
    await createNotification(supabase, {
      user_id: userId,
      notification_type: 'payment_due',
      title: '📦 Vendor Payment Due',
      message: `Payment to ${vendor.name} of $${vendor.next_payment_amount?.toLocaleString()} is due on ${vendor.next_payment_date}`,
      category: 'payment',
      priority: 'medium',
      amount: vendor.next_payment_amount,
      due_date: vendor.next_payment_date
    });
  }
}

async function checkIncomeReceived(supabase: any, userId: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // Check income received yesterday
  const { data: income } = await supabase
    .from('income')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'received')
    .gte('payment_date', yesterday.toISOString().split('T')[0])
    .lt('payment_date', new Date().toISOString().split('T')[0]);

  for (const item of income || []) {
    await createNotification(supabase, {
      user_id: userId,
      notification_type: 'income_received',
      title: '✅ Income Received',
      message: `Received ${item.description}: $${item.amount.toLocaleString()}`,
      category: 'income',
      priority: 'low',
      amount: item.amount
    });
  }

  // Check Amazon payouts
  const { data: payouts } = await supabase
    .from('amazon_payouts')
    .select('*, amazon_accounts!inner(account_name)')
    .eq('user_id', userId)
    .eq('payout_date', yesterday.toISOString().split('T')[0]);

  for (const payout of payouts || []) {
    await createNotification(supabase, {
      user_id: userId,
      notification_type: 'income_received',
      title: '💰 Amazon Payout Received',
      message: `${payout.amazon_accounts.account_name} payout: $${payout.total_amount.toLocaleString()}`,
      category: 'amazon',
      priority: 'low',
      amount: payout.total_amount
    });
  }
}

async function sendDailySummary(supabase: any, userId: string) {
  const today = new Date().toISOString().split('T')[0];

  // Get today's transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('transaction_date', today);

  const totalExpenses = transactions?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;

  // Get today's income
  const { data: income } = await supabase
    .from('income')
    .select('*')
    .eq('user_id', userId)
    .eq('payment_date', today);

  const totalIncome = income?.reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;

  // Get current balance
  const { data: settings } = await supabase
    .from('user_settings')
    .select('total_cash')
    .eq('user_id', userId)
    .single();

  const currentBalance = Number(settings?.total_cash || 0);

  await createNotification(supabase, {
    user_id: userId,
    notification_type: 'daily_summary',
    title: '📊 Daily Summary',
    message: `Today's activity: Income $${totalIncome.toLocaleString()} | Expenses $${totalExpenses.toLocaleString()} | Balance $${currentBalance.toLocaleString()}`,
    category: 'cash-flow',
    priority: 'low'
  });
}

async function sendWeeklySummary(supabase: any, userId: string) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get week's transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', weekAgo.toISOString().split('T')[0])
    .lte('transaction_date', today.toISOString().split('T')[0]);

  const totalExpenses = transactions?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;

  // Get week's income
  const { data: income } = await supabase
    .from('income')
    .select('*')
    .eq('user_id', userId)
    .gte('payment_date', weekAgo.toISOString().split('T')[0])
    .lte('payment_date', today.toISOString().split('T')[0]);

  const totalIncome = income?.reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;

  const netCashFlow = totalIncome - totalExpenses;

  await createNotification(supabase, {
    user_id: userId,
    notification_type: 'weekly_summary',
    title: '📈 Weekly Summary',
    message: `This week: Income $${totalIncome.toLocaleString()} | Expenses $${totalExpenses.toLocaleString()} | Net ${netCashFlow >= 0 ? '+' : ''}$${netCashFlow.toLocaleString()}`,
    category: 'cash-flow',
    priority: 'low'
  });
}

async function createNotification(supabase: any, data: any) {
  const { error } = await supabase
    .from('notification_history')
    .insert({
      user_id: data.user_id,
      notification_type: data.notification_type,
      title: data.title,
      message: data.message,
      category: data.category,
      priority: data.priority || 'medium',
      amount: data.amount,
      due_date: data.due_date,
      read: false,
      actionable: false
    });

  if (error) {
    console.error("[NOTIFICATIONS] Error creating notification:", error);
    throw error;
  }
}