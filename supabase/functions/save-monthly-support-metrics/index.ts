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

    // Get the previous month's date range
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
    const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59)
    const monthYear = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`

    console.log(`Calculating support metrics for: ${monthYear}`)
    console.log(`Date range: ${monthStart.toISOString()} to ${monthEnd.toISOString()}`)

    // Fetch all tickets for the month
    const { data: tickets, error: ticketsError } = await supabaseClient
      .from('support_tickets')
      .select('*')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    if (ticketsError) throw ticketsError

    // Calculate cases opened and closed
    const casesOpened = tickets?.length || 0
    const casesClosed = tickets?.filter(t => 
      t.resolved_at && 
      new Date(t.resolved_at) >= monthStart && 
      new Date(t.resolved_at) <= monthEnd
    ).length || 0

    // Calculate average resolution time (in days)
    const resolvedTickets = tickets?.filter(t => t.resolved_at) || []
    const avgResolutionDays = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          const created = new Date(t.created_at).getTime()
          const resolved = new Date(t.resolved_at).getTime()
          return sum + (resolved - created) / (1000 * 60 * 60 * 24)
        }, 0) / resolvedTickets.length
      : 0

    // Fetch all messages for first response time calculation
    const ticketIds = tickets?.map(t => t.id) || []
    const { data: messages, error: messagesError } = await supabaseClient
      .from('ticket_messages')
      .select('ticket_id, created_at, user_id')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    // Calculate first response time (time from ticket creation to first staff response)
    let totalFirstResponseHours = 0
    let firstResponseCount = 0

    for (const ticket of tickets || []) {
      const firstStaffMessage = messages?.find(m => 
        m.ticket_id === ticket.id && m.user_id !== ticket.user_id
      )
      
      if (firstStaffMessage) {
        const ticketTime = new Date(ticket.created_at).getTime()
        const responseTime = new Date(firstStaffMessage.created_at).getTime()
        totalFirstResponseHours += (responseTime - ticketTime) / (1000 * 60 * 60)
        firstResponseCount++
      }
    }

    const firstResponseHours = firstResponseCount > 0 
      ? totalFirstResponseHours / firstResponseCount 
      : 0

    // Calculate average response time (all staff responses)
    const staffResponses = messages?.filter(m => {
      const ticket = tickets?.find(t => t.id === m.ticket_id)
      return ticket && m.user_id !== ticket.user_id
    }) || []

    let totalResponseTime = 0
    let responseCount = 0

    for (const response of staffResponses) {
      const ticket = tickets?.find(t => t.id === response.ticket_id)
      if (!ticket) continue

      const previousMessages = messages?.filter(m => 
        m.ticket_id === response.ticket_id && 
        new Date(m.created_at) < new Date(response.created_at)
      ) || []

      const lastCustomerMessage = previousMessages
        .filter(m => m.user_id === ticket.user_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

      if (lastCustomerMessage) {
        const customerTime = new Date(lastCustomerMessage.created_at).getTime()
        const staffTime = new Date(response.created_at).getTime()
        totalResponseTime += (staffTime - customerTime) / (1000 * 60 * 60)
        responseCount++
      }
    }

    const avgResponseHours = responseCount > 0 ? totalResponseTime / responseCount : 0

    // Calculate SLA compliance
    const within4Hours = staffResponses.filter(r => {
      const ticket = tickets?.find(t => t.id === r.ticket_id)
      if (!ticket) return false
      const responseTime = (new Date(r.created_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60)
      return responseTime <= 4
    }).length

    const within24Hours = staffResponses.filter(r => {
      const ticket = tickets?.find(t => t.id === r.ticket_id)
      if (!ticket) return false
      const responseTime = (new Date(r.created_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60)
      return responseTime <= 24
    }).length

    // Response time by priority
    const priorityMap = new Map<string, { total: number; count: number }>()
    for (const response of staffResponses) {
      const ticket = tickets?.find(t => t.id === response.ticket_id)
      if (!ticket?.priority) continue

      const responseTime = (new Date(response.created_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60)
      
      if (!priorityMap.has(ticket.priority)) {
        priorityMap.set(ticket.priority, { total: 0, count: 0 })
      }
      
      const current = priorityMap.get(ticket.priority)!
      current.total += responseTime
      current.count++
    }

    const responseTimeByPriority = Array.from(priorityMap.entries()).map(([priority, data]) => ({
      priority,
      avgHours: data.count > 0 ? data.total / data.count : 0
    }))

    // Response time by category
    const categoryTimeMap = new Map<string, { total: number; count: number }>()
    for (const response of staffResponses) {
      const ticket = tickets?.find(t => t.id === response.ticket_id)
      const category = ticket?.category || 'Uncategorized'

      const responseTime = (new Date(response.created_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60)
      
      if (!categoryTimeMap.has(category)) {
        categoryTimeMap.set(category, { total: 0, count: 0 })
      }
      
      const current = categoryTimeMap.get(category)!
      current.total += responseTime
      current.count++
    }

    const responseTimeByCategory = Array.from(categoryTimeMap.entries()).map(([category, data]) => ({
      category,
      avgHours: data.count > 0 ? data.total / data.count : 0
    }))

    // Cases by category
    const categoryCountMap = new Map<string, number>()
    for (const ticket of tickets || []) {
      const category = ticket.category || 'Uncategorized'
      categoryCountMap.set(category, (categoryCountMap.get(category) || 0) + 1)
    }

    const casesByCategory = Array.from(categoryCountMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)

    // Insert or update metrics
    const { error: insertError } = await supabaseClient
      .from('monthly_support_metrics')
      .upsert({
        month_year: monthYear,
        cases_opened: casesOpened,
        cases_closed: casesClosed,
        avg_resolution_days: Math.round(avgResolutionDays * 100) / 100,
        first_response_hours: Math.round(firstResponseHours * 100) / 100,
        avg_response_hours: Math.round(avgResponseHours * 100) / 100,
        sla_within_4_hours: within4Hours,
        sla_within_24_hours: within24Hours,
        response_time_by_priority: responseTimeByPriority,
        response_time_by_category: responseTimeByCategory,
        cases_by_category: casesByCategory
      }, {
        onConflict: 'month_year'
      })

    if (insertError) throw insertError

    console.log(`Successfully saved metrics for ${monthYear}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        month: monthYear,
        metrics: {
          casesOpened,
          casesClosed,
          avgResolutionDays: Math.round(avgResolutionDays * 100) / 100,
          firstResponseHours: Math.round(firstResponseHours * 100) / 100,
          avgResponseHours: Math.round(avgResponseHours * 100) / 100
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error saving monthly support metrics:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
