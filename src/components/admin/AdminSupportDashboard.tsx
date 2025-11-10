import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle, MessageSquare, BarChart3 } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, differenceInDays, format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardStats {
  totalOpen: number;
  needsResponse: number;
  totalClosed: number;
  openedThisMonth: number;
  openedLastMonth: number;
  closedThisMonth: number;
  closedLastMonth: number;
  avgResolutionDays: number;
  categoryBreakdown: { category: string; count: number }[];
  avgFirstResponseHours: number;
  avgResponseTimeHours: number;
  slaCompliance: {
    within4Hours: number;
    within24Hours: number;
  };
  responseTimeByPriority: Array<{ priority: string; avgHours: number }>;
  responseTimeByCategory: Array<{ category: string; avgHours: number }>;
}

export const AdminSupportDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  // Generate last 12 months for dropdown
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy')
    };
  });

  useEffect(() => {
    fetchDashboardStats();
  }, [selectedMonth]);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all tickets
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch all ticket messages
      const { data: messages, error: messagesError } = await supabase
        .from('ticket_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Parse selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const selectedDate = new Date(year, month - 1);
      
      const thisMonthStart = startOfMonth(selectedDate);
      const thisMonthEnd = endOfMonth(selectedDate);
      const lastMonthStart = startOfMonth(subMonths(selectedDate, 1));
      const lastMonthEnd = endOfMonth(subMonths(selectedDate, 1));

      // Calculate stats
      const totalOpen = tickets?.filter(t => t.status === 'open').length || 0;
      const needsResponse = tickets?.filter(t => t.status === 'needs_response').length || 0;
      const totalClosed = tickets?.filter(t => t.status === 'closed').length || 0;

      const openedThisMonth = tickets?.filter(t => {
        const createdAt = new Date(t.created_at);
        return createdAt >= thisMonthStart && createdAt <= thisMonthEnd;
      }).length || 0;

      const openedLastMonth = tickets?.filter(t => {
        const createdAt = new Date(t.created_at);
        return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
      }).length || 0;

      const closedThisMonth = tickets?.filter(t => {
        const resolvedAt = t.resolved_at ? new Date(t.resolved_at) : null;
        return t.status === 'closed' && resolvedAt && resolvedAt >= thisMonthStart && resolvedAt <= thisMonthEnd;
      }).length || 0;

      const closedLastMonth = tickets?.filter(t => {
        const resolvedAt = t.resolved_at ? new Date(t.resolved_at) : null;
        return t.status === 'closed' && resolvedAt && resolvedAt >= lastMonthStart && resolvedAt <= lastMonthEnd;
      }).length || 0;

      // Calculate average resolution time
      const closedTickets = tickets?.filter(t => t.status === 'closed' && t.resolved_at) || [];
      const totalResolutionDays = closedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at);
        const resolved = new Date(ticket.resolved_at!);
        return sum + differenceInDays(resolved, created);
      }, 0);
      const avgResolutionDays = closedTickets.length > 0 ? Math.round(totalResolutionDays / closedTickets.length) : 0;

      // Calculate category breakdown
      const categoryMap = new Map<string, number>();
      tickets?.forEach(ticket => {
        const category = ticket.category || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
      const categoryBreakdown = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Calculate response time metrics
      let firstResponseTimes: number[] = [];
      let allResponseTimes: number[] = [];
      let within4Hours = 0;
      let within24Hours = 0;
      const priorityResponseTimes = new Map<string, number[]>();
      const categoryResponseTimes = new Map<string, number[]>();

      tickets?.forEach(ticket => {
        const ticketMessages = messages?.filter(m => m.ticket_id === ticket.id) || [];
        
        // First response time: from ticket creation to first admin message
        const firstAdminMessage = ticketMessages.find(m => m.user_id !== ticket.user_id);
        if (firstAdminMessage) {
          const firstResponseMs = new Date(firstAdminMessage.created_at).getTime() - new Date(ticket.created_at).getTime();
          const firstResponseHours = firstResponseMs / (1000 * 60 * 60);
          firstResponseTimes.push(firstResponseHours);

          // SLA tracking
          if (firstResponseHours <= 4) within4Hours++;
          if (firstResponseHours <= 24) within24Hours++;

          // By priority
          const priority = ticket.priority || 'medium';
          if (!priorityResponseTimes.has(priority)) {
            priorityResponseTimes.set(priority, []);
          }
          priorityResponseTimes.get(priority)!.push(firstResponseHours);

          // By category
          const category = ticket.category || 'Uncategorized';
          if (!categoryResponseTimes.has(category)) {
            categoryResponseTimes.set(category, []);
          }
          categoryResponseTimes.get(category)!.push(firstResponseHours);
        }

        // Average response time: customer message to next admin message
        for (let i = 0; i < ticketMessages.length - 1; i++) {
          const currentMsg = ticketMessages[i];
          const nextMsg = ticketMessages[i + 1];
          
          // If current is from customer and next is from admin
          if (currentMsg.user_id === ticket.user_id && nextMsg.user_id !== ticket.user_id) {
            const responseMs = new Date(nextMsg.created_at).getTime() - new Date(currentMsg.created_at).getTime();
            const responseHours = responseMs / (1000 * 60 * 60);
            allResponseTimes.push(responseHours);
          }
        }
      });

      const avgFirstResponseHours = firstResponseTimes.length > 0
        ? Math.round((firstResponseTimes.reduce((a, b) => a + b, 0) / firstResponseTimes.length) * 10) / 10
        : 0;

      const avgResponseTimeHours = allResponseTimes.length > 0
        ? Math.round((allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length) * 10) / 10
        : 0;

      const slaCompliance = {
        within4Hours: firstResponseTimes.length > 0 ? Math.round((within4Hours / firstResponseTimes.length) * 100) : 0,
        within24Hours: firstResponseTimes.length > 0 ? Math.round((within24Hours / firstResponseTimes.length) * 100) : 0,
      };

      const responseTimeByPriority = Array.from(priorityResponseTimes.entries())
        .map(([priority, times]) => ({
          priority,
          avgHours: Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10
        }))
        .sort((a, b) => {
          const order = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (order[a.priority as keyof typeof order] || 999) - (order[b.priority as keyof typeof order] || 999);
        });

      const responseTimeByCategory = Array.from(categoryResponseTimes.entries())
        .map(([category, times]) => ({
          category,
          avgHours: Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10
        }))
        .sort((a, b) => b.avgHours - a.avgHours);

      setStats({
        totalOpen,
        needsResponse,
        totalClosed,
        openedThisMonth,
        openedLastMonth,
        closedThisMonth,
        closedLastMonth,
        avgResolutionDays,
        categoryBreakdown,
        avgFirstResponseHours,
        avgResponseTimeHours,
        slaCompliance,
        responseTimeByPriority,
        responseTimeByCategory
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load dashboard stats
      </div>
    );
  }

  const openedChange = stats.openedLastMonth > 0 
    ? ((stats.openedThisMonth - stats.openedLastMonth) / stats.openedLastMonth * 100).toFixed(1)
    : stats.openedThisMonth > 0 ? 100 : 0;
  
  const closedChange = stats.closedLastMonth > 0
    ? ((stats.closedThisMonth - stats.closedLastMonth) / stats.closedLastMonth * 100).toFixed(1)
    : stats.closedThisMonth > 0 ? 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Support Ticket Dashboard</h2>
          <p className="text-muted-foreground">Overview of support ticket metrics and performance</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Cases</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOpen}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting resolution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Response</CardTitle>
            <MessageSquare className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.needsResponse}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Closed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClosed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cases Opened</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openedThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month vs {stats.openedLastMonth} last month
            </p>
            <div className={`text-xs font-medium mt-1 flex items-center gap-1 ${
              Number(openedChange) > 0 ? 'text-red-500' : Number(openedChange) < 0 ? 'text-green-500' : 'text-muted-foreground'
            }`}>
              {Number(openedChange) > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : Number(openedChange) < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              {openedChange}% {Number(openedChange) > 0 ? 'increase' : Number(openedChange) < 0 ? 'decrease' : 'no change'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cases Closed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closedThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month vs {stats.closedLastMonth} last month
            </p>
            <div className={`text-xs font-medium mt-1 flex items-center gap-1 ${
              Number(closedChange) > 0 ? 'text-green-500' : Number(closedChange) < 0 ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {Number(closedChange) > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : Number(closedChange) < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              {closedChange}% {Number(closedChange) > 0 ? 'increase' : Number(closedChange) < 0 ? 'decrease' : 'no change'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResolutionDays}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Days from open to closed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">First Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgFirstResponseHours}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average time to first admin reply
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTimeHours}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average reply time to customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.slaCompliance.within4Hours}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Responded within 4 hours
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.slaCompliance.within24Hours}% within 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Response Time by Priority */}
      {stats.responseTimeByPriority.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time by Priority</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.responseTimeByPriority.map((item) => (
                <div key={item.priority} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className={`text-sm font-medium capitalize px-2 py-1 rounded ${
                      item.priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
                      item.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                      item.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-sm font-bold ${
                      item.avgHours <= 4 ? 'text-green-500' :
                      item.avgHours <= 24 ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {item.avgHours}h avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Time by Category */}
      {stats.responseTimeByCategory.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time by Category</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.responseTimeByCategory.map((item, index) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                    <span className="text-sm font-medium">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-sm font-bold ${
                      item.avgHours <= 4 ? 'text-green-500' :
                      item.avgHours <= 24 ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {item.avgHours}h avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cases by Category</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.categoryBreakdown.length > 0 ? (
              stats.categoryBreakdown.map((item, index) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                    <span className="text-sm font-medium">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ 
                          width: `${(item.count / stats.categoryBreakdown[0].count) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold min-w-[2rem] text-right">{item.count}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tickets found
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
