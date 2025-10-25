import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    const { accountId, payoutModel } = await req.json();

    if (!accountId || !payoutModel) {
      throw new Error('Missing accountId or payoutModel');
    }

    console.log(`[FIX-ACCOUNT] Updating account ${accountId} to ${payoutModel} model`);

    // Update the account settings and reset sync status
    const { error: updateError } = await supabase
      .from('amazon_accounts')
      .update({
        payout_frequency: payoutModel,
        payout_model: payoutModel,
        sync_status: 'idle',
        sync_message: 'Ready to sync'
      })
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[FIX-ACCOUNT] Update error:', updateError);
      throw updateError;
    }

    console.log(`[FIX-ACCOUNT] Successfully updated account to ${payoutModel}`);

    return new Response(
      JSON.stringify({ success: true, message: `Account updated to ${payoutModel} payouts` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[FIX-ACCOUNT] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
