import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONVERT-TRIAL-ADDONS] ${step}${detailsStr}`);
};

// Pricing for add-ons (converted to purchased_addons)
const ADDON_PRICES = {
  bank_account: 10,
  amazon_account: 50,
  user: 15
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if user is still in trial
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('trial_end')
      .eq('user_id', user.id)
      .single();

    if (profile?.trial_end && new Date(profile.trial_end) > new Date()) {
      throw new Error("User is still in trial period");
    }

    logStep("Trial ended, checking for add-on usage");

    // Get trial addon usage
    const { data: trialUsage, error: usageError } = await supabaseClient
      .from('trial_addon_usage')
      .select('*')
      .eq('user_id', user.id);

    if (usageError) throw usageError;

    if (!trialUsage || trialUsage.length === 0) {
      logStep("No trial add-on usage found");
      return new Response(JSON.stringify({ 
        success: true,
        message: "No add-ons to convert"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found trial usage", { count: trialUsage.length });

    // Get user's account_id
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    const account_id = profile?.account_id;
    logStep("Found account", { account_id });
    
    // Convert trial usage to purchased add-ons (database only, no Stripe subscription items)
    const convertedItems = [];
    for (const usage of trialUsage) {
      if (usage.quantity > 0) {
        const unitPrice = ADDON_PRICES[usage.addon_type as keyof typeof ADDON_PRICES];
        
        logStep("Converting to purchased addon", { 
          type: usage.addon_type, 
          quantity: usage.quantity,
          price: unitPrice
        });
        
        // Insert as purchased addon (database record only)
        const { data: purchase, error: insertError } = await supabaseClient
          .from('purchased_addons')
          .insert({
            user_id: user.id,
            account_id: account_id,
            addon_type: usage.addon_type === 'bank_account' ? 'bank_connection' : 
                        usage.addon_type === 'amazon_account' ? 'amazon_connection' : 'user',
            quantity: usage.quantity,
            price_paid: unitPrice * usage.quantity,
            currency: 'usd',
            stripe_payment_intent_id: null, // No payment for trial conversion
            stripe_charge_id: null,
            purchased_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (insertError) {
          logStep("Error inserting purchased addon", { error: insertError });
          throw insertError;
        }
        
        convertedItems.push({
          type: usage.addon_type,
          purchaseId: purchase.id,
          quantity: usage.quantity
        });
        
        logStep("Converted to purchased addon", { 
          purchaseId: purchase.id,
          type: usage.addon_type
        });
      }
    }
    
    // Delete trial usage records
    const { error: deleteError } = await supabaseClient
      .from('trial_addon_usage')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      logStep("Warning: Failed to delete trial usage records", { error: deleteError });
    } else {
      logStep("Deleted trial usage records");
    }

    logStep("Conversion completed", { convertedCount: convertedItems.length });

    return new Response(JSON.stringify({ 
      success: true,
      convertedItems,
      message: `Successfully converted ${convertedItems.length} trial add-ons to purchased add-ons`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});