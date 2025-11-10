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
  modeling_method: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

interface AccountAccuracyMetrics {
  accountId: string;
  userName: string;
  userEmail: string;
  marketplace: string;
  payoutCount: number;
  originalPayoutCount?: number;
  excludedCount?: number;
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
  const [allLogs, setAllLogs] = useState<AccuracyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    totalAccounts: 0,
    totalPayouts: 0,
    avgMape: 0,
    avgOverallAccuracy: 0,
  });

  useEffect(() => {
    console.log('[Admin Forecast Accuracy] useEffect triggered - isAdmin:', isAdmin);
    if (isAdmin) {
      console.log('[Admin Forecast Accuracy] Admin verified, fetching metrics...');
      fetchAndCalculateMetrics();
    } else {
      console.log('[Admin Forecast Accuracy] User is not admin, skipping fetch');
    }
  }, [isAdmin]);

  const fetchAndCalculateMetrics = async () => {
    try {
      console.log('[Admin Forecast Accuracy] Fetching accuracy logs...');
      
      // Fetch logs and profiles separately, then merge
      const { data: logs, error: logsError } = await supabase
        .from('forecast_accuracy_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (logsError) {
        console.error('[Admin Forecast Accuracy] Query error:', logsError);
        throw logsError;
      }

      if (!logs || logs.length === 0) {
        console.log('[Admin Forecast Accuracy] No data returned from query');
        setIsLoading(false);
        return;
      }

      // Fetch profiles for all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('account_id, first_name, last_name, user_id, email');

      if (profilesError) {
        console.error('[Admin Forecast Accuracy] Profiles query error:', profilesError);
      }

      // Create a map of account_id to profile
      const profileMap = new Map(
        profiles?.map(p => [p.account_id, p]) || []
      );

      // Merge logs with profile data
      const data = logs.map(log => ({
        ...log,
        profiles: profileMap.get(log.account_id)
      }));

      console.log('[Admin Forecast Accuracy] Query result:', { 
        dataCount: data?.length,
        sampleRecord: data?.[0]
      });
      
      console.log('[Admin Forecast Accuracy] Processing data:', {
        totalRecords: data.length,
        uniqueEmails: [...new Set(data.map(d => d.user_email))]
      });

      // Store all logs for detailed view
      setAllLogs(data);

      // Group by amazon_account_id
      const accountGroups = data.reduce((acc, log) => {
        const key = log.amazon_account_id || 'unknown';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(log);
        return acc;
      }, {} as Record<string, AccuracyLog[]>);

      // Apply same outlier filtering that users see
      const applyOutlierFiltering = (logs: AccuracyLog[]) => {
        // Stage 1: Exclude extreme outliers with errors over 200%
        const thresholdFiltered = logs.filter(log => 
          Math.abs(log.difference_percentage) <= 200
        );
        
        if (thresholdFiltered.length === 0) return { filtered: [], excluded: logs.length };
        if (thresholdFiltered.length < 4) return { filtered: thresholdFiltered, excluded: logs.length - thresholdFiltered.length };
        
        // Stage 2: IQR outlier detection
        const errors = thresholdFiltered.map(log => Math.abs(log.difference_percentage));
        const sortedErrors = [...errors].sort((a, b) => a - b);
        
        const q1Index = Math.floor(sortedErrors.length * 0.25);
        const q3Index = Math.floor(sortedErrors.length * 0.75);
        const q1 = sortedErrors[q1Index];
        const q3 = sortedErrors[q3Index];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        const filtered = thresholdFiltered.filter((log, idx) => {
          const error = errors[idx];
          return error >= lowerBound && error <= upperBound;
        });
        
        return { 
          filtered, 
          excluded: logs.length - filtered.length 
        };
      };

      // Calculate metrics per account
      const metrics: AccountAccuracyMetrics[] = Object.entries(accountGroups).map(([accountId, logs]) => {
        const sortedLogs = logs.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Apply outlier filtering (same as user-facing component)
        const { filtered: filteredLogs, excluded: excludedCount } = applyOutlierFiltering(sortedLogs);
        
        // MAPE from filtered logs only
        const mape = filteredLogs.length > 0
          ? filteredLogs.reduce((sum, log) => sum + Math.abs(log.difference_percentage), 0) / filteredLogs.length
          : 0;

        // Overall Accuracy (100 - MAPE) from filtered logs
        const overallAccuracy = filteredLogs.length > 0
          ? Math.max(0, 100 - mape)
          : 0;

        // Accuracy trend: compare recent 5 vs previous 5 (using filtered data)
        const { filtered: recentLogsFiltered } = applyOutlierFiltering(
          sortedLogs.slice(0, Math.min(5, sortedLogs.length))
        );
        const { filtered: previousLogsFiltered } = applyOutlierFiltering(
          sortedLogs.slice(5, Math.min(10, sortedLogs.length))
        );

        const recentMape = recentLogsFiltered.length > 0
          ? recentLogsFiltered.reduce((sum, log) => sum + Math.abs(log.difference_percentage), 0) / recentLogsFiltered.length
          : mape;

        const previousMape = previousLogsFiltered.length > 0
          ? previousLogsFiltered.reduce((sum, log) => sum + Math.abs(log.difference_percentage), 0) / previousLogsFiltered.length
          : recentMape;

        const accuracyTrend = previousMape - recentMape;
        const recentAccuracy = recentLogsFiltered.length > 0
          ? Math.max(0, 100 - recentMape)
          : 0;

        // Percentage within thresholds (using filtered logs)
        const within5 = filteredLogs.length > 0
          ? (filteredLogs.filter(log => Math.abs(log.difference_percentage) <= 5).length / filteredLogs.length) * 100
          : 0;
        const within10 = filteredLogs.length > 0
          ? (filteredLogs.filter(log => Math.abs(log.difference_percentage) <= 10).length / filteredLogs.length) * 100
          : 0;

        const firstLog = sortedLogs[0];
        const userName = firstLog.profiles 
          ? `${firstLog.profiles.first_name || ''} ${firstLog.profiles.last_name || ''}`.trim() || 'Unknown'
          : firstLog.user_name || 'Unknown';
        
        const userEmail = firstLog.profiles?.email || firstLog.user_email || 'Unknown';

        return {
          accountId,
          userName,
          userEmail,
          marketplace: firstLog.marketplace_name || 'N/A',
          payoutCount: filteredLogs.length,
          originalPayoutCount: sortedLogs.length,
          excludedCount,
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
            Aggregated accuracy metrics per Amazon account
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
                        <div className="flex flex-col items-center">
                          <span>{metrics.payoutCount}</span>
                          {metrics.excludedCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({metrics.excludedCount} excluded)
                            </span>
                          )}
                        </div>
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

      {/* Individual Forecast Comparisons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            All Forecast Comparisons
          </CardTitle>
          <CardDescription>
            Detailed view of every forecast vs actual comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Payout Date</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Model Used</TableHead>
                  <TableHead className="text-right">MAPE %</TableHead>
                  <TableHead className="text-center">Accuracy</TableHead>
                  <TableHead>Tracked Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No forecast comparisons yet
                    </TableCell>
                  </TableRow>
                ) : (
                  allLogs.map((log) => {
                    const accuracy = Math.max(0, 100 - log.difference_percentage);
                    const modelDisplay = log.modeling_method === 'auren_forecast_v1' 
                      ? 'Auren V1' 
                      : log.modeling_method || 'Unknown';
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{log.user_name}</span>
                            <span className="text-xs text-muted-foreground">{log.user_email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Date(log.payout_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.marketplace_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {modelDisplay}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {log.difference_percentage.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={accuracy >= 90 ? "default" : accuracy >= 75 ? "secondary" : "outline"}>
                            {accuracy.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
