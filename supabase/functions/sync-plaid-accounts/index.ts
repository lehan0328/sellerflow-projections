import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accountId, accountType } = await req.json();
    
    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error('Plaid credentials not configured');
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Syncing ${accountType} account:`, accountId);

    // Get the account from database
    const tableName = accountType === 'credit_card' ? 'credit_cards' : 'bank_accounts';
    const { data: account, error: fetchError } = await supabase
      .from(tableName)
      .select('encrypted_access_token, encrypted_plaid_item_id, plaid_account_id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !account) {
      throw new Error('Account not found');
    }

    // Decrypt the access token using the secure function
    const { data: accessToken, error: decryptError } = await supabase.rpc('decrypt_banking_credential', {
      encrypted_text: account.encrypted_access_token
    });

    if (decryptError || !accessToken) {
      throw new Error('Failed to decrypt access token');
    }

    // DON'T fetch balance from Plaid (costs $0.10 per call)
    // Balance is now calculated from transactions only via database trigger
    console.log('Skipping balance fetch - balance calculated from transactions');

    // Just update the last_sync timestamp
    const updateResult = await supabase
      .from(tableName)
      .update({ last_sync: new Date().toISOString() })
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (updateResult.error) {
      throw updateResult.error;
    }

    console.log('Successfully updated sync timestamp. Balance auto-calculated from transactions.');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account synced. Balance calculated from transactions.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-plaid-accounts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
