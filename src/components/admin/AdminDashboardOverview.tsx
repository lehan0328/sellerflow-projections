import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  CreditCard, 
  LifeBuoy, 
  MessageSquare, 
  Gift,
  TrendingUp,
  DollarSign,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/hooks/useAdmin";

interface DashboardMetrics {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  activeSubscriptions: number;
  trialUsers: number;
  openTickets: number;
  needsResponseTickets: number;
  pendingFeatureRequests: number;
  activeReferrals: number;
  totalReferrals: number;
  recentSignups: Array<{
    email: string;
    created_at: string;
    first_name: string;
    last_name: string;
  }>;
}

interface StaffMember {
  email: string;
  first_name: string | null;
  role: 'admin' | 'staff';
  claimed_tickets_count: number;
  open_tickets_count: number;
  closed_tickets_count: number;
  user_id: string | null;
}

export function AdminDashboardOverview() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    openTickets: 0,
    needsResponseTickets: 0,
    pendingFeatureRequests: 0,
    activeReferrals: 0,
    totalReferrals: 0,
    recentSignups: [],
  });
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics();
    if (isAdmin) {
      fetchStaffList();
    }
  }, [isAdmin]);

  const fetchStaffList = async () => {
    try {
      setIsLoadingStaff(true);
      const { data, error } = await supabase.functions.invoke('get-admin-staff-list');
      
      if (error) {
        console.error('Error fetching staff list:', error);
        return;
      }
      
      setStaffList(data.staff || []);
    } catch (error) {
      console.error('Error fetching staff list:', error);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleViewStaffCases = (staffId: string, staffName: string) => {
    navigate(`/admin?tab=support&staffId=${staffId}&staffName=${encodeURIComponent(staffName)}`);
  };

  const getInitials = (firstName: string | null, email: string) => {
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  const fetchDashboardMetrics = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch total users and recent signups
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, created_at, trial_end, plan_override')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const totalUsers = allUsers?.length || 0;
      const newUsersToday = allUsers?.filter(u => 
        new Date(u.created_at) >= todayStart
      ).length || 0;
      const newUsersThisWeek = allUsers?.filter(u => 
        new Date(u.created_at) >= weekStart
      ).length || 0;
      
      // Count trial vs paid users
      const trialUsers = allUsers?.filter(u => 
        u.trial_end && new Date(u.trial_end) > now
      ).length || 0;
      
      // Active subscriptions (users with plan_override or past trial)
      const activeSubscriptions = allUsers?.filter(u => 
        u.plan_override || (u.trial_end && new Date(u.trial_end) <= now)
      ).length || 0;

      // Recent signups (last 10)
      const recentSignups = allUsers?.slice(0, 10).map(u => ({
        email: u.email || '',
        created_at: u.created_at || '',
        first_name: u.first_name || '',
        last_name: u.last_name || '',
      })) || [];

      // Fetch support tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id, status')
        .in('status', ['open', 'needs_response']);

      if (ticketsError) throw ticketsError;

      const openTickets = tickets?.length || 0;
      const needsResponseTickets = tickets?.filter(t => t.status === 'needs_response').length || 0;

      // Fetch feature requests
      const { data: features, error: featuresError } = await supabase
        .from('feature_requests')
        .select('id, status')
        .eq('status', 'pending');

      if (featuresError) throw featuresError;
      const pendingFeatureRequests = features?.length || 0;

      // Fetch referrals
      const { data: referrals, error: referralsError } = await supabase
        .from('referrals')
        .select('id, status');

      if (referralsError) throw referralsError;

      const totalReferrals = referrals?.length || 0;
      const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;

      setMetrics({
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        activeSubscriptions,
        trialUsers,
        openTickets,
        needsResponseTickets,
        pendingFeatureRequests,
        activeReferrals,
        totalReferrals,
        recentSignups,
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description, 
    trend,
    variant = "default" 
  }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    description?: string;
    trend?: { value: number; label: string };
    variant?: "default" | "success" | "warning" | "destructive";
  }) => {
    const variantStyles = {
      default: "bg-primary/10 text-primary",
      success: "bg-green-500/10 text-green-600",
      warning: "bg-amber-500/10 text-amber-600",
      destructive: "bg-red-500/10 text-red-600",
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className={`p-2 rounded-lg ${variantStyles[variant]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600 font-medium">
                +{trend.value} {trend.label}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-muted-foreground">
            Quick view of your application's key metrics
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground">
          Quick view of your application's key metrics
        </p>
      </div>

      {/* User Metrics */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">User Metrics</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers}
            icon={Users}
            description="All registered users"
            variant="default"
          />
          <MetricCard
            title="New Today"
            value={metrics.newUsersToday}
            icon={UserPlus}
            description="Users signed up today"
            variant="success"
          />
          <MetricCard
            title="New This Week"
            value={metrics.newUsersThisWeek}
            icon={TrendingUp}
            description="Last 7 days"
            variant="success"
          />
          <MetricCard
            title="Trial Users"
            value={metrics.trialUsers}
            icon={Clock}
            description="Active trial accounts"
            variant="warning"
          />
        </div>
      </div>

      {/* Subscription Metrics */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Subscription Metrics</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Active Subscriptions"
            value={metrics.activeSubscriptions}
            icon={CreditCard}
            description="Paid subscribers"
            variant="success"
          />
          <MetricCard
            title="Referrals"
            value={`${metrics.activeReferrals} / ${metrics.totalReferrals}`}
            icon={Gift}
            description="Active / Total"
            variant="default"
          />
          <MetricCard
            title="Conversion Rate"
            value={`${metrics.totalUsers > 0 ? Math.round((metrics.activeSubscriptions / metrics.totalUsers) * 100) : 0}%`}
            icon={Target}
            description="Users to paid"
            variant="default"
          />
          <MetricCard
            title="Trial Conversion"
            value={`${metrics.trialUsers > 0 ? Math.round(((metrics.totalUsers - metrics.trialUsers - metrics.activeSubscriptions) / metrics.trialUsers) * 100) : 0}%`}
            icon={CheckCircle}
            description="Trial to paid"
            variant="success"
          />
        </div>
      </div>

      {/* Support Metrics */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Support & Engagement</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Open Tickets"
            value={metrics.openTickets}
            icon={LifeBuoy}
            description="Total support tickets"
            variant={metrics.openTickets > 10 ? "warning" : "default"}
          />
          <MetricCard
            title="Needs Response"
            value={metrics.needsResponseTickets}
            icon={AlertCircle}
            description="Urgent attention required"
            variant={metrics.needsResponseTickets > 5 ? "destructive" : "warning"}
          />
          <MetricCard
            title="Feature Requests"
            value={metrics.pendingFeatureRequests}
            icon={MessageSquare}
            description="Pending review"
            variant="default"
          />
        </div>
      </div>

      {/* Recent Signups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Signups</CardTitle>
          <CardDescription>Latest 10 registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.recentSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent signups</p>
            ) : (
              metrics.recentSignups.map((signup, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {signup.first_name || signup.last_name 
                          ? `${signup.first_name || ''} ${signup.last_name || ''}`.trim()
                          : 'Anonymous User'}
                      </p>
                      <p className="text-xs text-muted-foreground">{signup.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {new Date(signup.created_at).toLocaleDateString()}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Staff Directory - Website Admins Only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Staff Directory
            </CardTitle>
            <CardDescription>All admin and staff members with their case load</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStaff ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : staffList.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No staff members found</p>
            ) : (
              <div className="space-y-3">
                {staffList.map((staff) => (
                  <div key={staff.email} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    {/* Left: Staff info */}
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(staff.first_name, staff.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{staff.first_name || staff.email}</p>
                        <p className="text-xs text-muted-foreground">{staff.email}</p>
                      </div>
                      <Badge variant={staff.role === 'admin' ? 'default' : 'secondary'}>
                        {staff.role}
                      </Badge>
                    </div>
                    
                    {/* Middle: Ticket stats */}
                    <div className="flex gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Total</p>
                        <p className="font-semibold text-lg">{staff.claimed_tickets_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Open</p>
                        <p className="font-semibold text-lg text-amber-600">{staff.open_tickets_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Closed</p>
                        <p className="font-semibold text-lg text-green-600">{staff.closed_tickets_count}</p>
                      </div>
                    </div>
                    
                    {/* Right: View Cases button */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewStaffCases(staff.user_id!, staff.first_name || staff.email)}
                      disabled={!staff.user_id || staff.claimed_tickets_count === 0}
                    >
                      <LifeBuoy className="h-4 w-4 mr-2" />
                      View Cases ({staff.claimed_tickets_count})
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
