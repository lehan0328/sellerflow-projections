import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, DollarSign, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAccountStatus } from "@/lib/adminUtils";

interface SubscriptionSummary {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalMRR: number;
  churnRate: number;
}

interface StripeData {
  subscription_id: string;
  status: string;
  plan_name: string;
  amount: number;
  currency: string;
  interval: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface UserSubscription {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  plan_override: string | null;
  plan_override_reason?: string | null;
  plan_tier?: string | null;
  stripe_customer_id: string | null;
  account_status: string;
  trial_end?: string | null;
  created_at: string;
  stripe_data: StripeData | null;
  stripe_subscription_status?: string | null;
  renewal_date?: string | null;
  last_paid_date?: string | null;
  churn_date?: string | null;
}

export const AdminSubscriptions = () => {
  const [summary, setSummary] = useState<SubscriptionSummary>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
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
      
      const { data, error } = await supabase.functions.invoke('get-admin-subscriptions');

      if (error) throw error;

      setSubscriptions(data.subscriptions);
      setSummary(data.summary);
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSubscriptions}</div>
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
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalMRR.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From Stripe data
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
              .map((sub) => (
                <div key={sub.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{sub.email}</p>
                        {sub.stripe_customer_id && (
                          <Badge variant="outline" className="text-xs">
                            Stripe
                          </Badge>
                        )}
                      </div>
                      {(sub.first_name || sub.last_name) && (
                        <p className="text-sm text-muted-foreground">
                          {[sub.first_name, sub.last_name].filter(Boolean).join(' ')}
                        </p>
                      )}
                      {sub.company && (
                        <p className="text-sm font-medium">{sub.company}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {sub.stripe_data && (
                        <Badge variant="default">
                          {sub.stripe_data.plan_name || sub.plan_override}
                        </Badge>
                      )}
                      <Badge variant={getAccountStatus(sub).variant}>
                        {getAccountStatus(sub).label}
                      </Badge>
                    </div>
                  </div>
                  
                  {sub.stripe_data && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2 border-t">
                      <div>
                        <span className="text-muted-foreground">Amount:</span>{' '}
                        <span className="font-medium">
                          ${sub.stripe_data.amount}/{sub.stripe_data.interval}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>{' '}
                        <span className="font-medium capitalize">{sub.stripe_data.status}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Next billing:</span>{' '}
                        <span className="font-medium">
                          {new Date(sub.stripe_data.current_period_end).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Joined:</span>{' '}
                        <span className="font-medium">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {sub.stripe_data?.cancel_at_period_end && (
                    <div className="pt-2">
                      <Badge variant="destructive">Cancels at period end</Badge>
                    </div>
                  )}
                </div>
              ))}
            
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
