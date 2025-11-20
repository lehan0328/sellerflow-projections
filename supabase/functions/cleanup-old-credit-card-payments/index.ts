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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting credit card payment cleanup...');

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const cutoffDate = sixtyDaysAgo.toISOString().split('T')[0];

    console.log(`Deleting completed credit card payments older than ${cutoffDate}`);

    // Delete completed credit card payments older than 60 days
    const { data: deletedPayments, error } = await supabase
      .from('credit_card_payments')
      .delete()
      .eq('status', 'completed')
      .lt('payment_date', cutoffDate)
      .select();

    if (error) throw error;

    console.log(`Successfully deleted ${deletedPayments?.length || 0} old completed credit card payments`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount: deletedPayments?.length || 0,
        message: `Cleaned up ${deletedPayments?.length || 0} old credit card payments`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error cleaning up credit card payments:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
