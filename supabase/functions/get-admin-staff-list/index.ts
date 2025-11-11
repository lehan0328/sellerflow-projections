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
  awaiting_response_count: number;
  needs_response_count: number;
  closed_tickets_count: number;
  average_rating: number | null;
  user_id?: string | null;
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

    // Hardcoded website admin emails
    const websiteAdminEmails = ['chuandy914@gmail.com', 'orders@imarand.com', 'daniel@levelbrands.com']
    const isWebsiteAdmin = user.email && websiteAdminEmails.includes(user.email)

    if (!isWebsiteAdmin) {
      console.log('Access denied for:', user.email)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin access granted for:', user.email)

    // Fetch all staff from admin_permissions
    const { data: staffData, error: staffError } = await supabase
      .from('admin_permissions')
      .select('email, first_name, role, invited_at, account_created')
      .eq('account_created', true)
      .order('invited_at', { ascending: false });

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch staff list' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all auth users once for efficiency
    const { data: authUsersList } = await supabase.auth.admin.listUsers();

    // For each staff member, get their user_id from auth.users and ticket statistics
    const staffWithStats: StaffMember[] = await Promise.all(
      (staffData || []).map(async (staff) => {
        const matchedUser = authUsersList?.users?.find(u => u.email === staff.email);
        const userId = matchedUser?.id;

        if (!userId) {
          return {
            ...staff,
            user_id: null,
            claimed_tickets_count: 0,
            awaiting_response_count: 0,
            needs_response_count: 0,
            closed_tickets_count: 0,
            average_rating: null,
          };
        }

        // Only fetch ticket stats for staff role, not admin role
        if (staff.role === 'admin') {
          return {
            ...staff,
            user_id: userId,
            claimed_tickets_count: 0,
            awaiting_response_count: 0,
            needs_response_count: 0,
            closed_tickets_count: 0,
            average_rating: null,
          };
        }

        // Get total claimed tickets
        const { count: totalCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('claimed_by', userId);

        // Get awaiting response tickets (staff sent message, waiting for customer)
        const { count: awaitingCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('claimed_by', userId)
          .in('status', ['open', 'in_progress']);

        // Get needs response tickets (customer replied, staff needs to respond)
        const { count: needsResponseCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('claimed_by', userId)
          .eq('status', 'needs_response');

        // Get closed tickets (closed, resolved)
        const { count: closedCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('claimed_by', userId)
          .in('status', ['closed', 'resolved']);

        // Get average rating from ticket_feedback
        const { data: feedbackData } = await supabase
          .from('ticket_feedback')
          .select('rating')
          .eq('staff_id', userId);

        const averageRating = feedbackData && feedbackData.length > 0
          ? feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length
          : null;

        return {
          ...staff,
          user_id: userId,
          claimed_tickets_count: totalCount || 0,
          awaiting_response_count: awaitingCount || 0,
          needs_response_count: needsResponseCount || 0,
          closed_tickets_count: closedCount || 0,
          average_rating: averageRating ? Math.round(averageRating * 10) / 10 : null,
        };
      })
    );

    // Add hardcoded admin emails that may not be in admin_permissions
    const hardcodedAdmins: StaffMember[] = [];
    for (const email of websiteAdminEmails) {
      // Check if this admin is already in staffWithStats
      const existsInStaff = staffWithStats.some(s => s.email === email);
      if (!existsInStaff) {
        const matchedUser = authUsersList?.users?.find(u => u.email === email);
        hardcodedAdmins.push({
          email,
          first_name: matchedUser?.user_metadata?.first_name || null,
          role: 'admin',
          invited_at: '',
          account_created: true,
          user_id: matchedUser?.id || null,
          claimed_tickets_count: 0,
          awaiting_response_count: 0,
          needs_response_count: 0,
          closed_tickets_count: 0,
          average_rating: null,
        });
      }
    }

    const allStaff = [...hardcodedAdmins, ...staffWithStats];

    console.log(`Fetched ${allStaff.length} total admin and staff members with statistics`);

    return new Response(
      JSON.stringify({ staff: allStaff }),
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
