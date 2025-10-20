import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";

interface AccuracyLog {
  id: string;
  user_name: string;
  user_email: string;
  monthly_revenue: string;
  payout_date: string;
  forecasted_amount: number;
  actual_amount: number;
  difference_amount: number;
  difference_percentage: number;
  marketplace_name: string;
  created_at: string;
}

export function AdminForecastAccuracy() {
  const { isAdmin } = useAdmin();
  const [logs, setLogs] = useState<AccuracyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    avgAccuracy: 0,
    totalTracked: 0,
    within5Percent: 0,
    within10Percent: 0,
  });

  useEffect(() => {
    if (isAdmin) {
      fetchAccuracyLogs();
    }
  }, [isAdmin]);

  const fetchAccuracyLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('forecast_accuracy_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs(data || []);

      // Calculate stats
      if (data && data.length > 0) {
        const avgAccuracy = data.reduce((sum, log) => 
          sum + Math.abs(log.difference_percentage), 0
        ) / data.length;

        const within5 = data.filter(log => 
          Math.abs(log.difference_percentage) <= 5
        ).length;

        const within10 = data.filter(log => 
          Math.abs(log.difference_percentage) <= 10
        ).length;

        setStats({
          avgAccuracy,
          totalTracked: data.length,
          within5Percent: (within5 / data.length) * 100,
          within10Percent: (within10 / data.length) * 100,
        });
      }
    } catch (error) {
      console.error('Error fetching accuracy logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAccuracyBadge = (percentage: number) => {
    const abs = Math.abs(percentage);
    if (abs <= 5) return <Badge className="bg-green-500">Excellent</Badge>;
    if (abs <= 10) return <Badge className="bg-blue-500">Good</Badge>;
    if (abs <= 20) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
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
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTracked}</div>
            <p className="text-xs text-muted-foreground">Payouts compared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgAccuracy.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Mean absolute error</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Within 5%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.within5Percent.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Excellent accuracy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Within 10%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.within10Percent.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Good accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Forecast Accuracy Log
          </CardTitle>
          <CardDescription>
            Comparison of forecasted vs actual Amazon payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead className="text-right">Forecasted</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead className="text-right">% Diff</TableHead>
                  <TableHead>Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No forecast accuracy data yet
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {formatDate(log.payout_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.user_name}</span>
                          <span className="text-xs text-muted-foreground">{log.user_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.monthly_revenue || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{log.marketplace_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(log.forecasted_amount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(log.actual_amount)}
                      </TableCell>
                      <TableCell className={`text-right ${
                        log.difference_amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <div className="flex items-center justify-end gap-1">
                          {log.difference_amount >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {formatCurrency(Math.abs(log.difference_amount))}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        log.difference_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {log.difference_percentage >= 0 ? '+' : ''}
                        {log.difference_percentage.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        {getAccuracyBadge(log.difference_percentage)}
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
