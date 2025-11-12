import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, TrendingUp, Gift, MapPin } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface SignupData {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  monthly_amazon_revenue: string;
  referral_code: string | null;
  hear_about_us: string | null;
  created_at: string;
}

interface SignupMetrics {
  totalSignups: number;
  referralPercentage: number;
  sourceBreakdown: Record<string, number>;
  revenueBreakdown: Record<string, number>;
}

export function AdminSignupDashboard() {
  const { isAdmin } = useAdmin();
  const [allSignups, setAllSignups] = useState<SignupData[]>([]);
  const [metrics, setMetrics] = useState<SignupMetrics>({
    totalSignups: 0,
    referralPercentage: 0,
    sourceBreakdown: {},
    revenueBreakdown: {},
  });
  const [isLoading, setIsLoading] = useState(true);


  // Fetch all-time data once
  useEffect(() => {
    if (isAdmin) {
      fetchAllTimeData();
    }
  }, [isAdmin]);

  const fetchAllTimeData = async () => {
    try {
      // Fetch all profiles
      const { data: allData, error: allError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, company, monthly_amazon_revenue, referral_code, hear_about_us, created_at')
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      // Fetch admin emails to exclude
      const { data: adminEmails, error: adminError } = await supabase
        .from('admin_permissions')
        .select('email');

      if (adminError) throw adminError;

      const adminEmailList = adminEmails?.map(a => a.email) || [];

      // Filter out admin/staff users client-side
      const allSignupsData = (allData || []).filter(profile => 
        !adminEmailList.includes(profile.email)
      );
      
      setAllSignups(allSignupsData);

      // Calculate all-time metrics
      const totalSignups = allSignupsData.length;
      const signupsWithReferral = allSignupsData.filter(s => s.referral_code).length;
      const referralPercentage = totalSignups > 0 ? (signupsWithReferral / totalSignups) * 100 : 0;

      // Source breakdown (all-time)
      const sourceBreakdown: Record<string, number> = {};
      allSignupsData.forEach(signup => {
        const source = signup.hear_about_us || 'Unknown';
        sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
      });

      // Revenue breakdown (all-time)
      const revenueBreakdown: Record<string, number> = {};
      allSignupsData.forEach(signup => {
        const revenue = signup.monthly_amazon_revenue || 'Unknown';
        revenueBreakdown[revenue] = (revenueBreakdown[revenue] || 0) + 1;
      });

      setMetrics({
        totalSignups,
        referralPercentage,
        sourceBreakdown,
        revenueBreakdown,
      });
    } catch (error) {
      console.error('Error fetching signup data:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const formatSource = (source: string | null) => {
    if (!source) return 'Not specified';
    return source
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatRevenue = (revenue: string | null) => {
    if (!revenue) return 'Not specified';
    return revenue;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading signup data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Signup Analytics</h2>
        <p className="text-muted-foreground">Track signup metrics and acquisition sources</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSignups}</div>
            <p className="text-xs text-muted-foreground">All-time signups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referral Rate</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.referralPercentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">All-time signups with referral code</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Source</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(metrics.sourceBreakdown).length > 0
                ? formatSource(Object.entries(metrics.sourceBreakdown).sort((a, b) => b[1] - a[1])[0][0])
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">All-time top acquisition channel</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Revenue Range</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(metrics.revenueBreakdown).length > 0
                ? Object.entries(metrics.revenueBreakdown).sort((a, b) => b[1] - a[1])[0][0]
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">All-time top revenue bracket</p>
          </CardContent>
        </Card>
      </div>

      {/* Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Acquisition Sources (All-Time)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.sourceBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => {
                  const percentage = ((count / metrics.totalSignups) * 100).toFixed(1);
                  return (
                    <div key={source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm font-medium">{formatSource(source)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{count}</span>
                        <Badge variant="secondary">{percentage}%</Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Distribution (All-Time)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.revenueBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([revenue, count]) => {
                  const percentage = ((count / metrics.totalSignups) * 100).toFixed(1);
                  return (
                    <div key={revenue} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm font-medium">{formatRevenue(revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{count}</span>
                        <Badge variant="secondary">{percentage}%</Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Signup Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Signups</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Revenue Range</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead>Signup Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allSignups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No signups yet
                  </TableCell>
                </TableRow>
              ) : (
                allSignups.map((signup) => (
                  <TableRow key={signup.user_id}>
                    <TableCell>
                      <div className="font-medium">
                        {signup.first_name} {signup.last_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {signup.email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {signup.company || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatRevenue(signup.monthly_amazon_revenue)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatSource(signup.hear_about_us)}</Badge>
                    </TableCell>
                    <TableCell>
                      {signup.referral_code ? (
                        <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                          {signup.referral_code}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(signup.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
