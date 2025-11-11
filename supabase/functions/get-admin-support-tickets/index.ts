import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the auth header from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user is website admin (hardcoded emails)
    const websiteAdminEmails = ['chuandy914@gmail.com', 'orders@imarand.com']
    const isWebsiteAdmin = user.email && websiteAdminEmails.includes(user.email)

    // Check admin_permissions table
    const { data: adminPermission } = await supabaseClient
      .from('admin_permissions')
      .select('role, first_name')
      .eq('email', user.email)
      .single()

    const isAdmin = isWebsiteAdmin || adminPermission
    const userRole = adminPermission?.role || 'admin'
    const isStaff = userRole === 'staff'

    if (!isAdmin) {
      console.log('Access denied for:', user.email, 'isWebsiteAdmin:', isWebsiteAdmin, 'adminPermission:', adminPermission)
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Admin access granted for:', user.email, 'role:', userRole)

    // Fetch tickets based on role
    let ticketsQuery = supabaseClient
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Staff can only see unclaimed tickets or tickets they claimed
    if (isStaff) {
      ticketsQuery = ticketsQuery.or(`claimed_by.is.null,claimed_by.eq.${user.id}`)
    }

    const { data: tickets, error: ticketsError } = await ticketsQuery

    if (ticketsError) throw ticketsError

    // Fetch staff names for claimed tickets
    const { data: adminPermissions } = await supabaseClient
      .from('admin_permissions')
      .select('email, first_name')

    // Create email to name mapping
    const staffNameMap = new Map<string, string>()
    adminPermissions?.forEach((perm: any) => {
      if (perm.email && perm.first_name) {
        staffNameMap.set(perm.email, perm.first_name)
      }
    })

    // Fetch all users (using service role)
    const { data: authUsers, error: usersError } = await supabaseClient.auth.admin.listUsers()
    
    if (usersError) throw usersError

    // Fetch profiles for company info
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('user_id, company, account_id')
    
    // Fetch user roles
    const { data: allUserRoles } = await supabaseClient
      .from('user_roles')
      .select('user_id, role')

    // Create mappings
    const userEmailMap = new Map<string, string>()
    authUsers.users.forEach((u: any) => {
      if (u.id && u.email) userEmailMap.set(u.id, u.email)
    })

    // Create account to company mapping
    const accountCompanyMap = new Map<string, string>()
    profiles?.forEach((p: any) => {
      if (p.account_id && p.company) {
        accountCompanyMap.set(p.account_id, p.company)
      }
    })

    // Map user to company via their account_id
    const userCompanyMap = new Map<string, string>()
    profiles?.forEach((p: any) => {
      if (p.user_id && p.account_id) {
        const company = accountCompanyMap.get(p.account_id)
        if (company) userCompanyMap.set(p.user_id, company)
      }
    })

    const userRoleMap = new Map<string, string>()
    allUserRoles?.forEach((r: any) => {
      if (r.user_id && r.role) userRoleMap.set(r.user_id, r.role)
    })

    // Enrich tickets with user info and staff names
    const enrichedTickets = (tickets || []).map(ticket => {
      let claimedByName = null
      if (ticket.claimed_by) {
        const claimedByEmail = userEmailMap.get(ticket.claimed_by)
        if (claimedByEmail) {
          claimedByName = staffNameMap.get(claimedByEmail)
        }
      }

      return {
        ...ticket,
        user_email: userEmailMap.get(ticket.user_id),
        user_company: userCompanyMap.get(ticket.user_id),
        user_role: userRoleMap.get(ticket.user_id),
        claimed_by_name: claimedByName
      }
    })

    return new Response(
      JSON.stringify({ tickets: enrichedTickets }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
