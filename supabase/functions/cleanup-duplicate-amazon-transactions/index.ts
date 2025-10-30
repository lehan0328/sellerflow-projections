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

    const { userId } = await req.json();
    const targetUserId = userId || user.id;

    console.log(`Cleaning up duplicate Amazon transactions for user: ${targetUserId}`);

    // Find all duplicate transaction_ids for this user
    const { data: duplicates, error: findError } = await supabase
      .from('amazon_transactions')
      .select('transaction_id, id, created_at')
      .eq('user_id', targetUserId)
      .order('transaction_id')
      .order('created_at', { ascending: true });

    if (findError) {
      console.error('Error finding duplicates:', findError);
      throw findError;
    }

    // Group by transaction_id and keep only the first (oldest) one
    const transactionMap = new Map();
    const idsToDelete: string[] = [];

    for (const transaction of duplicates || []) {
      if (transactionMap.has(transaction.transaction_id)) {
        // This is a duplicate, mark for deletion
        idsToDelete.push(transaction.id);
      } else {
        // This is the first occurrence, keep it
        transactionMap.set(transaction.transaction_id, transaction.id);
      }
    }

    console.log(`Found ${idsToDelete.length} duplicate transactions to delete`);

    if (idsToDelete.length > 0) {
      // Delete duplicates in batches
      const batchSize = 1000;
      let deletedCount = 0;

      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error: deleteError, count } = await supabase
          .from('amazon_transactions')
          .delete({ count: 'exact' })
          .in('id', batch);

        if (deleteError) {
          console.error(`Error deleting batch ${i}-${i + batchSize}:`, deleteError);
          throw deleteError;
        }

        deletedCount += count || 0;
        console.log(`Deleted batch: ${deletedCount}/${idsToDelete.length}`);
      }

      console.log(`Successfully deleted ${deletedCount} duplicate transactions`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Duplicate transactions cleaned up successfully',
        deleted: idsToDelete.length,
        unique_transactions: transactionMap.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cleanup-duplicate-amazon-transactions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
