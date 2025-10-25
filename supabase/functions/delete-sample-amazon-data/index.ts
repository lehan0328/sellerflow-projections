import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Deleting sample Amazon data for user: ${user.id}`);

    // Delete sample Amazon payouts (marketplace_name = 'Amazon.com')
    const { error: payoutsError, count: payoutsCount } = await supabase
      .from('amazon_payouts')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .eq('marketplace_name', 'Amazon.com');

    if (payoutsError) {
      console.error('Error deleting sample payouts:', payoutsError);
      throw payoutsError;
    }

    console.log(`Deleted ${payoutsCount} sample payouts`);

    // Delete sample Amazon transactions
    const { error: transactionsError, count: transactionsCount } = await supabase
      .from('amazon_transactions')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .eq('marketplace_name', 'Amazon.com');

    if (transactionsError) {
      console.error('Error deleting sample transactions:', transactionsError);
      throw transactionsError;
    }

    console.log(`Deleted ${transactionsCount} sample transactions`);

    // Delete sample daily summaries
    const { error: summariesError, count: summariesCount } = await supabase
      .from('amazon_transactions_daily_summary')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .eq('marketplace_name', 'Amazon.com');

    if (summariesError) {
      console.error('Error deleting sample summaries:', summariesError);
      throw summariesError;
    }

    console.log(`Deleted ${summariesCount} sample daily summaries`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sample data deleted successfully',
        deleted: {
          payouts: payoutsCount,
          transactions: transactionsCount,
          summaries: summariesCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-sample-amazon-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
