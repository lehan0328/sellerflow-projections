import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  // Logging disabled
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const body = await req.json();
    const { lineItems } = body;
    
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      throw new Error("lineItems array is required and must not be empty");
    }
    
    logStep("Received line items", { lineItems });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found. Please subscribe to a plan first.");
    }
    
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });
    
    // Find active or trialing subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    
    const activeSubscription = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );
    
    if (!activeSubscription) {
      throw new Error("No active subscription found. Please subscribe to a plan first.");
    }
    
    logStep("Found active subscription", { 
      subscriptionId: activeSubscription.id,
      status: activeSubscription.status,
      currentItems: activeSubscription.items.data.length
    });
    
    // Add each item to the subscription 
    const addedItems = [];
    for (const item of lineItems) {
      logStep("Adding subscription item", { priceId: item.price, quantity: item.quantity });
      
      const subscriptionItem = await stripe.subscriptionItems.create({
        subscription: activeSubscription.id,
        price: item.price,
        quantity: item.quantity,
        proration_behavior: 'create_prorations', // Automatically handle pro-rating
      });
      
      addedItems.push({
        id: subscriptionItem.id,
        priceId: item.price,
        quantity: item.quantity
      });
      
      logStep("Added subscription item", { 
        itemId: subscriptionItem.id,
        priceId: item.price,
        quantity: item.quantity
      });
    }
    
    // Get updated subscription to calculate pro-rated amount
    const updatedSubscription = await stripe.subscriptions.retrieve(activeSubscription.id);
    
    logStep("Subscription updated successfully", { 
      subscriptionId: updatedSubscription.id,
      totalItems: updatedSubscription.items.data.length,
      addedCount: addedItems.length
    });
    
    // Update max_team_members if user addon was purchased
    const userAddonPriceId = "price_1SEHQoB28kMY3UsedGTbBbmA";
    const userAddonsAdded = addedItems.filter(item => item.priceId === userAddonPriceId);
    
    if (userAddonsAdded.length > 0) {
      const totalUserSeatsAdded = userAddonsAdded.reduce((sum, item) => sum + item.quantity, 0);
      
      // Use service role client for admin operations
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      
      // Get current max_team_members
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('max_team_members')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        const newMaxTeamMembers = (profile.max_team_members || 1) + totalUserSeatsAdded;
        
        // Update profile with new limit
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ max_team_members: newMaxTeamMembers })
          .eq('user_id', user.id);
        
        if (updateError) {
          logStep("Warning: Failed to update max_team_members", { error: updateError.message });
        } else {
          logStep("Updated max_team_members", { 
            oldValue: profile.max_team_members, 
            newValue: newMaxTeamMembers,
            added: totalUserSeatsAdded 
          });
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      subscriptionId: updatedSubscription.id,
      addedItems,
      message: "Add-ons successfully added to your subscription"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      userMessage: errorMessage.includes("No active subscription") || errorMessage.includes("No Stripe customer")
        ? errorMessage
        : "Failed to add items to subscription. Please try again."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});