import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface StaffMember {
  email: string;
  first_name: string | null;
  role: string;
  invited_at: string;
  account_created: boolean;
  claimed_tickets_count: number;
  open_tickets_count: number;
  closed_tickets_count: number;
  user_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token or user not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is website admin
    const { data: isAdmin, error: adminCheckError } = await supabase
      .rpc('is_website_admin');

    if (adminCheckError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all staff from admin_permissions
    const { data: staffData, error: staffError } = await supabase
      .from('admin_permissions')
      .select('email, first_name, role, invited_at, account_created, user_id')
      .eq('account_created', true)
      .order('invited_at', { ascending: false });

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch staff list' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For each staff member, get their ticket statistics
    const staffWithStats: StaffMember[] = await Promise.all(
      (staffData || []).map(async (staff) => {
        if (!staff.user_id) {
          return {
            ...staff,
            claimed_tickets_count: 0,
            open_tickets_count: 0,
            closed_tickets_count: 0,
          };
        }

        // Get total claimed tickets
        const { count: totalCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('claimed_by', staff.user_id);

        // Get open tickets (open, in_progress, needs_response)
        const { count: openCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('claimed_by', staff.user_id)
          .in('status', ['open', 'in_progress', 'needs_response']);

        // Get closed tickets (closed, resolved)
        const { count: closedCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('claimed_by', staff.user_id)
          .in('status', ['closed', 'resolved']);

        return {
          ...staff,
          claimed_tickets_count: totalCount || 0,
          open_tickets_count: openCount || 0,
          closed_tickets_count: closedCount || 0,
        };
      })
    );

    console.log(`Fetched ${staffWithStats.length} staff members with statistics`);

    return new Response(
      JSON.stringify({ staff: staffWithStats }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-admin-staff-list function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
