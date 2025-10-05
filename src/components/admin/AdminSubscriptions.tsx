import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, DollarSign, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionSummary {
  totalCustomers: number;
  activeSubscriptions: number;
  totalMRR: number;
  churnRate: number;
}

export const AdminSubscriptions = () => {
  const [summary, setSummary] = useState<SubscriptionSummary>({
    totalCustomers: 0,
    activeSubscriptions: 0,
    totalMRR: 0,
    churnRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptionSummary();
  }, []);

  const fetchSubscriptionSummary = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all profiles to get total customers
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // This is a simplified summary - in production you'd call your Stripe API
      // through an edge function to get accurate subscription data
      setSummary({
        totalCustomers: profiles?.length || 0,
        activeSubscriptions: profiles?.filter(p => p.plan_override).length || 0,
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <p className="text-sm text-muted-foreground mt-2">
            For detailed subscription management, use the Stripe dashboard or implement
            additional Stripe API integration through edge functions.
          </p>
        </CardHeader>
      </Card>
    </div>
  );
};
