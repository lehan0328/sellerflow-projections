import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELETE-USER-ACCOUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const adminUserId = userData.user?.id;
    if (!adminUserId) throw new Error("User not authenticated");

    // Check if user has admin role
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      throw new Error("User does not have admin privileges");
    }

    logStep("Admin verified", { adminUserId });

    // Get userId to delete from request body
    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");

    logStep("Deleting user account", { userId });

    // Delete all user data in order (handling foreign key constraints)
    // Start with dependent tables first
    
    await supabaseAdmin.from('ticket_messages').delete().eq('user_id', userId);
    logStep("Deleted ticket_messages");

    await supabaseAdmin.from('support_tickets').delete().eq('user_id', userId);
    logStep("Deleted support_tickets");

    await supabaseAdmin.from('affiliate_referrals').delete().eq('referred_user_id', userId);
    logStep("Deleted affiliate_referrals as referred user");

    await supabaseAdmin.from('affiliate_referrals').delete().match({ affiliate_id: userId });
    logStep("Deleted affiliate_referrals as affiliate");

    await supabaseAdmin.from('affiliate_payouts').delete().eq('affiliate_id', userId);
    logStep("Deleted affiliate_payouts");

    await supabaseAdmin.from('affiliates').delete().eq('user_id', userId);
    logStep("Deleted affiliates");

    await supabaseAdmin.from('referrals').delete().eq('referred_user_id', userId);
    logStep("Deleted referrals as referred user");

    await supabaseAdmin.from('referrals').delete().eq('referrer_id', userId);
    logStep("Deleted referrals as referrer");

    await supabaseAdmin.from('referral_rewards').delete().eq('user_id', userId);
    logStep("Deleted referral_rewards");

    await supabaseAdmin.from('referral_codes').delete().eq('user_id', userId);
    logStep("Deleted referral_codes");

    await supabaseAdmin.from('team_invitations').delete().eq('invited_by', userId);
    logStep("Deleted team_invitations");

    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    logStep("Deleted user_roles");

    await supabaseAdmin.from('trial_addon_usage').delete().eq('user_id', userId);
    logStep("Deleted trial_addon_usage");

    await supabaseAdmin.from('scenarios').delete().eq('user_id', userId);
    logStep("Deleted scenarios");

    await supabaseAdmin.from('user_settings').delete().eq('user_id', userId);
    logStep("Deleted user_settings");

    await supabaseAdmin.from('deleted_transactions').delete().eq('user_id', userId);
    logStep("Deleted deleted_transactions");

    await supabaseAdmin.from('transactions').delete().eq('user_id', userId);
    logStep("Deleted transactions");

    await supabaseAdmin.from('vendors').delete().eq('user_id', userId);
    logStep("Deleted vendors");

    await supabaseAdmin.from('customers').delete().eq('user_id', userId);
    logStep("Deleted customers");

    await supabaseAdmin.from('income').delete().eq('user_id', userId);
    logStep("Deleted income");

    await supabaseAdmin.from('recurring_expenses').delete().eq('user_id', userId);
    logStep("Deleted recurring_expenses");

    await supabaseAdmin.from('cash_flow_insights').delete().eq('user_id', userId);
    logStep("Deleted cash_flow_insights");

    await supabaseAdmin.from('cash_flow_events').delete().eq('user_id', userId);
    logStep("Deleted cash_flow_events");

    await supabaseAdmin.from('bank_transactions').delete().eq('user_id', userId);
    logStep("Deleted bank_transactions");

    await supabaseAdmin.from('bank_accounts').delete().eq('user_id', userId);
    logStep("Deleted bank_accounts");

    await supabaseAdmin.from('credit_cards').delete().eq('user_id', userId);
    logStep("Deleted credit_cards");

    await supabaseAdmin.from('amazon_transactions').delete().eq('user_id', userId);
    logStep("Deleted amazon_transactions");

    await supabaseAdmin.from('amazon_payouts').delete().eq('user_id', userId);
    logStep("Deleted amazon_payouts");

    await supabaseAdmin.from('amazon_accounts').delete().eq('user_id', userId);
    logStep("Deleted amazon_accounts");

    await supabaseAdmin.from('password_reset_tokens').delete().eq('user_id', userId);
    logStep("Deleted password_reset_tokens");

    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
    logStep("Deleted profile");

    // Finally delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      logStep("Error deleting auth user", { error: deleteAuthError });
      throw deleteAuthError;
    }
    logStep("Deleted auth user");

    logStep("Account deletion completed successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
