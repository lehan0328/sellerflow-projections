import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Target, Activity } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";

interface AccuracyLog {
  id: string;
  user_name: string;
  user_email: string;
  monthly_revenue: string;
  payout_date: string;
  difference_percentage: number;
  marketplace_name: string;
  amazon_account_id: string;
  account_id: string;
  created_at: string;
}

interface AccountAccuracyMetrics {
  accountId: string;
  userName: string;
  userEmail: string;
  marketplace: string;
  payoutCount: number;
  overallAccuracy: number; // 100 - avgError
  mape: number; // Mean Absolute Percentage Error
  accuracyTrend: number; // Change in last 5 vs previous 5
  recentAccuracy: number; // Last 5 payouts
  within5Percent: number;
  within10Percent: number;
}

export function AdminForecastAccuracy() {
  const { isAdmin } = useAdmin();
  const [accountMetrics, setAccountMetrics] = useState<AccountAccuracyMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    totalAccounts: 0,
    totalPayouts: 0,
    avgMape: 0,
    avgOverallAccuracy: 0,
  });

  useEffect(() => {
    if (isAdmin) {
      fetchAndCalculateMetrics();
    }
  }, [isAdmin]);

  const fetchAndCalculateMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('forecast_accuracy_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setIsLoading(false);
        return;
      }

      // Group by amazon_account_id
      const accountGroups = data.reduce((acc, log) => {
        const key = log.amazon_account_id || 'unknown';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(log);
        return acc;
      }, {} as Record<string, AccuracyLog[]>);

      // Calculate metrics per account
      const metrics: AccountAccuracyMetrics[] = Object.entries(accountGroups).map(([accountId, logs]) => {
        const sortedLogs = logs.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // MAPE (Mean Absolute Percentage Error)
        const mape = sortedLogs.reduce((sum, log) => 
          sum + Math.abs(log.difference_percentage), 0
        ) / sortedLogs.length;

        // Overall Accuracy (100 - MAPE for simplicity)
        const overallAccuracy = Math.max(0, 100 - mape);

        // Accuracy trend: compare recent 5 vs previous 5
        const recentLogs = sortedLogs.slice(0, Math.min(5, sortedLogs.length));
        const previousLogs = sortedLogs.slice(5, Math.min(10, sortedLogs.length));

        const recentMape = recentLogs.length > 0
          ? recentLogs.reduce((sum, log) => sum + Math.abs(log.difference_percentage), 0) / recentLogs.length
          : mape;

        const previousMape = previousLogs.length > 0
          ? previousLogs.reduce((sum, log) => sum + Math.abs(log.difference_percentage), 0) / previousLogs.length
          : recentMape;

        const accuracyTrend = previousMape - recentMape; // Positive = improving

        const recentAccuracy = Math.max(0, 100 - recentMape);

        // Percentage within thresholds
        const within5 = (sortedLogs.filter(log => Math.abs(log.difference_percentage) <= 5).length / sortedLogs.length) * 100;
        const within10 = (sortedLogs.filter(log => Math.abs(log.difference_percentage) <= 10).length / sortedLogs.length) * 100;

        return {
          accountId,
          userName: sortedLogs[0].user_name || 'Unknown',
          userEmail: sortedLogs[0].user_email || 'Unknown',
          marketplace: sortedLogs[0].marketplace_name || 'N/A',
          payoutCount: sortedLogs.length,
          overallAccuracy,
          mape,
          accuracyTrend,
          recentAccuracy,
          within5Percent: within5,
          within10Percent: within10,
        };
      });

      // Sort by payout count (most active first)
      metrics.sort((a, b) => b.payoutCount - a.payoutCount);

      setAccountMetrics(metrics);

      // Calculate global stats
      const totalPayouts = metrics.reduce((sum, m) => sum + m.payoutCount, 0);
      const avgMape = metrics.reduce((sum, m) => sum + m.mape, 0) / metrics.length;
      const avgOverallAccuracy = metrics.reduce((sum, m) => sum + m.overallAccuracy, 0) / metrics.length;

      setGlobalStats({
        totalAccounts: metrics.length,
        totalPayouts,
        avgMape,
        avgOverallAccuracy,
      });

    } catch (error) {
      console.error('Error fetching accuracy logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 95) return <Badge className="bg-green-500">Excellent</Badge>;
    if (accuracy >= 90) return <Badge className="bg-blue-500">Good</Badge>;
    if (accuracy >= 80) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const getTrendBadge = (trend: number) => {
    if (trend > 2) return <Badge className="bg-green-500">Improving</Badge>;
    if (trend < -2) return <Badge variant="destructive">Declining</Badge>;
    return <Badge variant="outline">Stable</Badge>;
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return <Card>
      <CardHeader>
        <CardTitle>Forecast Accuracy Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Loading...</p>
      </CardContent>
    </Card>;
  }

  return (
    <div className="space-y-6">
      {/* Global Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.totalAccounts}</div>
            <p className="text-xs text-muted-foreground">Amazon accounts tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.totalPayouts}</div>
            <p className="text-xs text-muted-foreground">Forecasts compared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {globalStats.avgOverallAccuracy.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Overall accuracy rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg MAPE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.avgMape.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Mean absolute % error</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Account Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Account-Level Forecast Accuracy
          </CardTitle>
          <CardDescription>
            Aggregated accuracy metrics per Amazon account (exact amounts hidden per policy)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center">
                      <span># Payouts</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center">
                      <span>Overall</span>
                      <span className="text-xs text-muted-foreground">Accuracy</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center">
                      <span>MAPE</span>
                      <span className="text-xs text-muted-foreground">Avg Error</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center">
                      <span>Recent</span>
                      <span className="text-xs text-muted-foreground">Last 5</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center">
                      <span>Trend</span>
                      <span className="text-xs text-muted-foreground">vs Previous</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center">
                      <span>Within 5%</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center">
                      <span>Within 10%</span>
                    </div>
                  </TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountMetrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No forecast accuracy data yet
                    </TableCell>
                  </TableRow>
                ) : (
                  accountMetrics.map((metrics) => (
                    <TableRow key={metrics.accountId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{metrics.userName}</span>
                          <span className="text-xs text-muted-foreground">{metrics.userEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{metrics.marketplace}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {metrics.payoutCount}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-bold text-green-600">
                            {metrics.overallAccuracy.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">
                          {metrics.mape.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium">
                          {metrics.recentAccuracy.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {metrics.accuracyTrend > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : metrics.accuracyTrend < 0 ? (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          ) : (
                            <Activity className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={`text-sm font-medium ${
                            metrics.accuracyTrend > 0 ? 'text-green-600' : 
                            metrics.accuracyTrend < 0 ? 'text-red-600' : 
                            'text-muted-foreground'
                          }`}>
                            {metrics.accuracyTrend > 0 ? '+' : ''}
                            {metrics.accuracyTrend.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium text-green-600">
                          {metrics.within5Percent.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium text-blue-600">
                          {metrics.within10Percent.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {getAccuracyBadge(metrics.overallAccuracy)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
