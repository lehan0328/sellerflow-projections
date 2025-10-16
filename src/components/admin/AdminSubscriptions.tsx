import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, DollarSign, TrendingUp, Users, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionSummary {
  totalCustomers: number;
  activeSubscriptions: number;
  trialUsers: number;
  totalMRR: number;
  churnRate: number;
}

interface UserSubscription {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  plan_override: string | null;
  trial_start: string | null;
  trial_end: string | null;
  stripe_customer_id: string | null;
  account_status: string;
  created_at: string;
}

export const AdminSubscriptions = () => {
  const [summary, setSummary] = useState<SubscriptionSummary>({
    totalCustomers: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    totalMRR: 0,
    churnRate: 0
  });
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptionSummary();
  }, []);

  const fetchSubscriptionSummary = async () => {
    try {
      setIsLoading(true);
      
      // Fetch profiles with user emails
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user emails from auth.users
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Create a map of user_id to email
      const emailMap = new Map<string, string>(
        (users || []).map(u => [u.id, u.email || 'N/A'])
      );

      // Combine profile data with emails
      const userSubscriptions: UserSubscription[] = (profiles || []).map(p => ({
        id: p.user_id,
        email: emailMap.get(p.user_id) || 'N/A',
        first_name: p.first_name,
        last_name: p.last_name,
        company: p.company,
        plan_override: p.plan_override,
        trial_start: p.trial_start,
        trial_end: p.trial_end,
        stripe_customer_id: p.stripe_customer_id,
        account_status: p.account_status,
        created_at: p.created_at
      }));

      setSubscriptions(userSubscriptions);

      // Count users currently in trial (trial_end is in the future)
      const now = new Date();
      const trialUsers = profiles?.filter(p => {
        if (!p.trial_end) return false;
        const trialEndDate = new Date(p.trial_end);
        return trialEndDate > now;
      }).length || 0;

      setSummary({
        totalCustomers: profiles?.length || 0,
        activeSubscriptions: profiles?.filter(p => p.plan_override).length || 0,
        trialUsers,
        totalMRR: 0, // Would be calculated from Stripe data
        churnRate: 0 // Would be calculated from historical data
      });
    } catch (error: any) {
      console.error('Error fetching subscription summary:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading subscription data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCustomers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.trialUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active trials
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalMRR.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Connect Stripe for accurate data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.churnRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Details</CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subscriptions
              .filter(sub => {
                if (!searchTerm) return true;
                const search = searchTerm.toLowerCase();
                return (
                  sub.email.toLowerCase().includes(search) ||
                  sub.first_name?.toLowerCase().includes(search) ||
                  sub.last_name?.toLowerCase().includes(search) ||
                  sub.company?.toLowerCase().includes(search)
                );
              })
              .map((sub) => {
                const now = new Date();
                const isInTrial = sub.trial_end && new Date(sub.trial_end) > now;
                const trialExpired = sub.trial_end && new Date(sub.trial_end) <= now;
                
                return (
                  <div key={sub.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{sub.email}</p>
                          {sub.stripe_customer_id && (
                            <Badge variant="outline" className="text-xs">
                              Stripe Customer
                            </Badge>
                          )}
                        </div>
                        {(sub.first_name || sub.last_name) && (
                          <p className="text-sm text-muted-foreground">
                            {[sub.first_name, sub.last_name].filter(Boolean).join(' ')}
                          </p>
                        )}
                        {sub.company && (
                          <p className="text-sm text-muted-foreground">{sub.company}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {isInTrial && (
                          <Badge variant="default">Trial</Badge>
                        )}
                        {trialExpired && !sub.plan_override && (
                          <Badge variant="destructive">Trial Expired</Badge>
                        )}
                        {sub.plan_override && (
                          <Badge variant="secondary">{sub.plan_override}</Badge>
                        )}
                        <Badge variant={sub.account_status === 'active' ? 'default' : 'outline'}>
                          {sub.account_status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground pt-2">
                      {sub.trial_end && (
                        <div>
                          <span className="font-medium">Trial Ends:</span>{' '}
                          {new Date(sub.trial_end).toLocaleDateString()}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Joined:</span>{' '}
                        {new Date(sub.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            
            {subscriptions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No subscriptions found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
