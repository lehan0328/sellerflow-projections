import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, differenceInDays } from "date-fns";

interface DashboardStats {
  totalOpen: number;
  needsResponse: number;
  totalClosed: number;
  openedThisMonth: number;
  openedLastMonth: number;
  closedThisMonth: number;
  closedLastMonth: number;
  avgResolutionDays: number;
}

export const AdminSupportDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all tickets
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

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

      setStats({
        totalOpen,
        needsResponse,
        totalClosed,
        openedThisMonth,
        openedLastMonth,
        closedThisMonth,
        closedLastMonth,
        avgResolutionDays
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
      <div>
        <h2 className="text-2xl font-bold mb-2">Support Ticket Dashboard</h2>
        <p className="text-muted-foreground">Overview of support ticket metrics and performance</p>
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
    </div>
  );
};
