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
  Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardMetrics {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  activeSubscriptions: number;
  trialUsers: number;
  openTickets: number;
  awaitingResponseTickets: number;
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

export function AdminDashboardOverview() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    openTickets: 0,
    awaitingResponseTickets: 0,
    needsResponseTickets: 0,
    pendingFeatureRequests: 0,
    activeReferrals: 0,
    totalReferrals: 0,
    recentSignups: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch admin/staff emails to exclude them (all invitations, not just completed signups)
      const { data: adminPermissions } = await supabase
        .from('admin_permissions')
        .select('email');

      const adminEmails = new Set(adminPermissions?.map(a => a.email) || []);
      
      // Also exclude hardcoded website admin emails
      adminEmails.add('chuandy914@gmail.com');
      adminEmails.add('orders@imarand.com');

      // Fetch total users and recent signups (excluding admins/staff)
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, created_at, trial_end, plan_override')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Filter out admin/staff users
      const regularUsers = allUsers?.filter(u => !adminEmails.has(u.email || '')) || [];

      const totalUsers = regularUsers.length;
      const newUsersToday = regularUsers.filter(u => 
        new Date(u.created_at) >= todayStart
      ).length;
      const newUsersThisWeek = regularUsers.filter(u => 
        new Date(u.created_at) >= weekStart
      ).length;
      
      // Count actual paying subscribers with Stripe subscriptions
      const { data: subscriptionData, error: subError } = await supabase.functions.invoke('get-admin-subscriptions', {
        body: {}
      });
      
      if (subError) {
        console.error('Error fetching subscriptions:', subError);
      }
      
      const activeSubscriptions = subscriptionData?.summary?.activeSubscriptions || 0;
      
      // Count trial users (users still in trial period, excluding admins/staff)
      const trialUsers = regularUsers.filter(u => 
        u.trial_end && new Date(u.trial_end) > now
      ).length;

      // Recent signups (last 10, excluding admins/staff)
      const recentSignups = regularUsers.slice(0, 10).map(u => ({
        email: u.email || '',
        created_at: u.created_at || '',
        first_name: u.first_name || '',
        last_name: u.last_name || '',
      }));

      // Fetch support tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id, status, claimed_by');

      if (ticketsError) throw ticketsError;

      // Open tickets = new unclaimed tickets awaiting to be claimed
      const openTickets = tickets?.filter(t => !t.claimed_by && t.status !== 'closed' && t.status !== 'resolved').length || 0;
      const awaitingResponseTickets = tickets?.filter(t => t.claimed_by && (t.status === 'open' || t.status === 'in_progress')).length || 0;
      const needsResponseTickets = tickets?.filter(t => t.claimed_by && t.status === 'needs_response').length || 0;

      // Fetch feature requests
      const { data: features, error: featuresError } = await supabase
        .from('feature_requests')
        .select('id, status')
        .eq('status', 'pending');

      if (featuresError) throw featuresError;
      const pendingFeatureRequests = features?.length || 0;

      // Fetch referrals from profiles (users who signed up with a referral code)
      const { data: referralUsers, error: referralsError } = await supabase
        .from('profiles')
        .select('user_id, email, referral_code, trial_end, stripe_customer_id')
        .not('referral_code', 'is', null)
        .neq('referral_code', '');

      if (referralsError) {
        console.error('Error fetching referrals:', referralsError);
      }

      // Filter out admin emails from referral users
      const validReferralUsers = referralUsers?.filter(u => !adminEmails.has(u.email || '')) || [];
      
      const totalReferrals = validReferralUsers.length;
      
      // Active referrals = users with referral code who have active subscriptions
      // Cross-reference with Stripe subscription data
      const activeSubscriptionEmails = new Set(
        subscriptionData?.subscriptions
          ?.filter((sub: any) => sub.status === 'active')
          .map((sub: any) => sub.customer_email) || []
      );
      
      const activeReferrals = validReferralUsers.filter(u => 
        u.email && activeSubscriptionEmails.has(u.email)
      ).length;

      setMetrics({
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        activeSubscriptions,
        trialUsers,
        openTickets,
        awaitingResponseTickets,
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
            value={`${(metrics.totalUsers - metrics.trialUsers) > 0 ? Math.round((metrics.activeSubscriptions / (metrics.totalUsers - metrics.trialUsers)) * 100) : 0}%`}
            icon={CheckCircle}
            description="Trial to paid"
            variant="success"
          />
        </div>
      </div>

      {/* Support Metrics */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Support & Engagement</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Open Tickets"
            value={metrics.openTickets}
            icon={LifeBuoy}
            description="New tickets awaiting claim"
            variant={metrics.openTickets > 10 ? "warning" : "default"}
          />
          <MetricCard
            title="Awaiting Response"
            value={metrics.awaitingResponseTickets}
            icon={Clock}
            description="Staff waiting for customer"
            variant="default"
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
    </div>
  );
}
