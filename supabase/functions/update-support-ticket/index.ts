import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create a client with the user's token to verify authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('[UPDATE-SUPPORT-TICKET] User authenticated:', user.id, user.email);

    // Check if user is an admin (either website admin or has admin/owner role)
    const isWebsiteAdmin = user.email === 'chuandy914@gmail.com' || user.email === 'orders@imarand.com';
    
    let hasAdminRole = false;
    if (!isWebsiteAdmin) {
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'owner'])
        .maybeSingle();
      
      hasAdminRole = !!roleData;
    }

    if (!isWebsiteAdmin && !hasAdminRole) {
      console.log('[UPDATE-SUPPORT-TICKET] User is not an admin');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[UPDATE-SUPPORT-TICKET] Admin access confirmed');

    // Parse request body
    const { ticketId, status, resolutionNotes } = await req.json();

    if (!ticketId || !status) {
      throw new Error('Missing required fields: ticketId and status');
    }

    console.log('[UPDATE-SUPPORT-TICKET] Updating ticket:', ticketId, 'to status:', status);

    // Prepare update data
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set resolved_at when closing ticket
    if (status === 'closed' || status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    // Add resolution notes if provided
    if (resolutionNotes) {
      updates.resolution_notes = resolutionNotes;
    }

    // Update ticket using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('[UPDATE-SUPPORT-TICKET] Error updating ticket:', error);
      throw error;
    }

    console.log('[UPDATE-SUPPORT-TICKET] Ticket updated successfully:', data.id);

    return new Response(
      JSON.stringify({ success: true, ticket: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[UPDATE-SUPPORT-TICKET] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
