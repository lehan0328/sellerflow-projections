import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Users, TrendingUp, DollarSign } from "lucide-react";

interface CodeUsage {
  code: string;
  type: 'referral' | 'affiliate';
  totalUses: number;
  activeSubscriptions: number;
  discountAmount: string;
  duration: string;
  createdBy?: string;
  status?: string;
}

export function AdminCodeTracking() {
  const [codes, setCodes] = useState<CodeUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCodes: 0,
    totalUses: 0,
    activeConversions: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    fetchCodeTracking();
  }, []);

  const fetchCodeTracking = async () => {
    try {
      // Fetch all referral codes from profiles
      const { data: referralData } = await supabase
        .from('profiles')
        .select('referral_code, email')
        .not('referral_code', 'is', null)
        .neq('referral_code', '');

      // Fetch affiliate codes from affiliates table
      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('affiliate_code, status, user_id');

      // Get subscription data to check active subscriptions
      const { data: subscriptionData } = await supabase.functions.invoke('get-admin-subscriptions', {
        body: {}
      });

      const activeSubscriptionEmails = new Set(
        subscriptionData?.subscriptions
          ?.filter((sub: any) => sub.status === 'active')
          .map((sub: any) => sub.customer_email) || []
      );

      // Count referral code usage
      const referralCounts = new Map<string, { total: number; active: number; emails: Set<string> }>();
      referralData?.forEach((profile) => {
        const code = profile.referral_code!.toUpperCase();
        if (!referralCounts.has(code)) {
          referralCounts.set(code, { total: 0, active: 0, emails: new Set() });
        }
        const stats = referralCounts.get(code)!;
        stats.total++;
        stats.emails.add(profile.email || '');
        if (profile.email && activeSubscriptionEmails.has(profile.email)) {
          stats.active++;
        }
      });

      // Process affiliate codes
      const affiliateCounts = new Map<string, { total: number; active: number; status: string; emails: Set<string> }>();
      
      for (const affiliate of affiliateData || []) {
        const code = affiliate.affiliate_code.toUpperCase();
        
        // Find users who signed up with this affiliate code
        const { data: affiliateUsers } = await supabase
          .from('affiliate_referrals')
          .select('referred_user_id, status');

        const { data: userProfiles } = await supabase
          .from('profiles')
          .select('email')
          .in('user_id', affiliateUsers?.map(u => u.referred_user_id) || []);

        const userEmails = new Set(userProfiles?.map(p => p.email || '') || []);
        const activeCount = Array.from(userEmails).filter(email => activeSubscriptionEmails.has(email)).length;

        affiliateCounts.set(code, {
          total: userEmails.size,
          active: activeCount,
          status: affiliate.status,
          emails: userEmails
        });
      }

      // Combine into CodeUsage array
      const allCodes: CodeUsage[] = [];

      // Add referral codes
      referralCounts.forEach((stats, code) => {
        allCodes.push({
          code,
          type: 'referral',
          totalUses: stats.total,
          activeSubscriptions: stats.active,
          discountAmount: '30% off',
          duration: '3 months',
        });
      });

      // Add affiliate codes
      affiliateCounts.forEach((stats, code) => {
        allCodes.push({
          code,
          type: 'affiliate',
          totalUses: stats.total,
          activeSubscriptions: stats.active,
          discountAmount: '30% off',
          duration: '3 months',
          status: stats.status,
        });
      });

      // Sort by total uses
      allCodes.sort((a, b) => b.totalUses - a.totalUses);

      setCodes(allCodes);

      // Calculate stats
      const totalUses = allCodes.reduce((sum, code) => sum + code.totalUses, 0);
      const activeConversions = allCodes.reduce((sum, code) => sum + code.activeSubscriptions, 0);
      
      setStats({
        totalCodes: allCodes.length,
        totalUses,
        activeConversions,
        conversionRate: totalUses > 0 ? Math.round((activeConversions / totalUses) * 100) : 0,
      });
    } catch (error) {
      console.error('Error fetching code tracking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Code Tracking</h2>
          <p className="text-muted-foreground">Track referral and affiliate code usage</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
        <h2 className="text-3xl font-bold tracking-tight">Code Tracking</h2>
        <p className="text-muted-foreground">
          Track referral and affiliate code usage and conversions
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCodes}</div>
            <p className="text-xs text-muted-foreground">Active referral & affiliate codes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUses}</div>
            <p className="text-xs text-muted-foreground">Times codes have been used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeConversions}</div>
            <p className="text-xs text-muted-foreground">Converted to paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Trial to paid conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Code Usage Details</CardTitle>
          <CardDescription>All referral and affiliate codes with usage statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {codes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No codes tracked yet</p>
            ) : (
              <div className="space-y-3">
                {codes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-lg">{code.code}</span>
                        <Badge variant={code.type === 'affiliate' ? 'default' : 'secondary'}>
                          {code.type === 'affiliate' ? 'Affiliate' : 'User Referral'}
                        </Badge>
                        {code.status && (
                          <Badge variant={code.status === 'approved' ? 'default' : 'outline'}>
                            {code.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {code.discountAmount} • {code.duration}
                      </p>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{code.totalUses}</p>
                        <p className="text-xs text-muted-foreground">Total Uses</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{code.activeSubscriptions}</p>
                        <p className="text-xs text-muted-foreground">Active Subs</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          {code.totalUses > 0 
                            ? `${Math.round((code.activeSubscriptions / code.totalUses) * 100)}%`
                            : '0%'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">Conversion</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
