import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's account_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.account_id) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if vendor exists, if not create one
    let vendorId;
    const { data: existingVendors } = await supabaseClient
      .from('vendors')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (existingVendors && existingVendors.length > 0) {
      vendorId = existingVendors[0].id;
    } else {
      // Create a sample vendor
      const { data: newVendor, error: vendorError } = await supabaseClient
        .from('vendors')
        .insert({
          user_id: user.id,
          account_id: profile.account_id,
          name: 'Sample Supplier Co.',
          category: 'Inventory',
        })
        .select('id')
        .single();

      if (vendorError) {
        return new Response(JSON.stringify({ error: 'Failed to create vendor' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      vendorId = newVendor.id;
    }

    // Create overdue purchase order
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() - 15); // 15 days overdue
    
    const transactionDate = new Date(today);
    transactionDate.setDate(transactionDate.getDate() - 30); // Ordered 30 days ago

    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id: profile.account_id,
        type: 'purchase_order',
        amount: 2500.00,
        description: 'Inventory Purchase - Office Supplies',
        vendor_id: vendorId,
        transaction_date: transactionDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
        remarks: 'Overdue - Payment Required',
      })
      .select()
      .single();

    if (transactionError) {
      return new Response(JSON.stringify({ error: transactionError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        transaction,
        message: 'Overdue purchase order created successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ADD-SAMPLE-OVERDUE-PO] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
