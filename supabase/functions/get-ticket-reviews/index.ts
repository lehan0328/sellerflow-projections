import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('admin_permissions')
      .select('role')
      .eq('email', user.email!)
      .eq('account_created', true)
      .single();

    const isWebsiteAdmin = user.email === 'chuandy914@gmail.com' || user.email === 'orders@imarand.com';

    if (!adminCheck && !isWebsiteAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all ticket feedback
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('ticket_feedback')
      .select('id, ticket_id, rating, comment, created_at')
      .order('created_at', { ascending: false });

    if (feedbackError) throw feedbackError;

    if (!feedbackData || feedbackData.length === 0) {
      return new Response(JSON.stringify({ reviews: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch ticket details
    const ticketIds = feedbackData.map(f => f.ticket_id);
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, subject, user_id, claimed_by')
      .in('id', ticketIds);

    if (ticketsError) throw ticketsError;

    // Fetch staff names
    const { data: adminPermissions } = await supabase
      .from('admin_permissions')
      .select('email, first_name');

    // Fetch all users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    // Create mappings
    const userEmailMap = new Map<string, string>();
    users.forEach((u: any) => {
      if (u.id && u.email) userEmailMap.set(u.id, u.email);
    });

    const staffNameMap = new Map<string, string>();
    adminPermissions?.forEach((perm: any) => {
      const userId = users.find((u: any) => u.email === perm.email)?.id;
      if (userId && perm.first_name) {
        staffNameMap.set(userId, perm.first_name);
      }
    });

    // Enrich reviews with ticket and user data
    const enrichedReviews = feedbackData.map(feedback => {
      const ticket = ticketsData?.find(t => t.id === feedback.ticket_id);
      return {
        ...feedback,
        ticket_number: ticket?.ticket_number || 0,
        ticket_subject: ticket?.subject || 'Unknown',
        staff_name: ticket?.claimed_by ? staffNameMap.get(ticket.claimed_by) || null : null,
        user_email: ticket?.user_id ? userEmailMap.get(ticket.user_id) || null : null,
      };
    });

    return new Response(JSON.stringify({ reviews: enrichedReviews }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching ticket reviews:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
