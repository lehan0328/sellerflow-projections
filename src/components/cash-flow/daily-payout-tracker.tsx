import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarClock, TrendingUp, Wallet, AlertCircle, DollarSign } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DailyPayoutTrackerProps {
  amazonAccountId: string;
  settlementId: string;
  settlementDate: string;
  dailyAmounts: Array<{ date: string; amount: number; cumulative: number }>;
  lumpSumAmount: number;
  totalDrawsToDate: number;
}

export function DailyPayoutTracker({
  amazonAccountId,
  settlementId,
  settlementDate,
  dailyAmounts,
  lumpSumAmount,
  totalDrawsToDate,
}: DailyPayoutTrackerProps) {
  const [isTransferring, setIsTransferring] = useState(false);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayData = dailyAmounts.find(d => d.date === todayStr);
  const availableToday = todayData?.amount || 0;
  const cumulativeAvailable = todayData?.cumulative || 0;
  const daysUntilSettlement = dailyAmounts.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleTransferToday = async () => {
    if (availableToday <= 0) {
      toast.error("No funds available for transfer today");
      return;
    }

    setIsTransferring(true);
    try {
      const { error } = await supabase.functions.invoke('record-daily-draw', {
        body: {
          amazonAccountId,
          amount: availableToday,
          settlementId,
        }
      });

      if (error) throw error;

      toast.success(`Transfer of ${formatCurrency(availableToday)} recorded`);
      
      // Refresh the page to show updated amounts
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error recording transfer:', error);
      toast.error("Failed to record transfer");
    } finally {
      setIsTransferring(false);
    }
  };

  // Calculate progress
  const totalProjected = lumpSumAmount + totalDrawsToDate;
  const progressPercentage = totalProjected > 0 
    ? (totalDrawsToDate / totalProjected) * 100 
    : 0;

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              Daily Payout Tracker
            </CardTitle>
            <CardDescription>
              Settlement on {formatDate(settlementDate)} ({daysUntilSettlement} days)
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/20">
            Daily Model
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Available Today */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Available Today</p>
              <p className="text-3xl font-bold text-finance-positive">
                {formatCurrency(availableToday)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cumulative if not withdrawn: {formatCurrency(cumulativeAvailable)}
              </p>
            </div>
            <Button 
              onClick={handleTransferToday} 
              disabled={isTransferring || availableToday <= 0}
              size="lg"
              className="bg-finance-positive hover:bg-finance-positive/90"
            >
              {isTransferring ? "Processing..." : "Transfer Today"}
            </Button>
          </div>
        </div>

        {/* Lump Sum Settlement */}
        <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Final Settlement (Lump Sum)</p>
                <p className="text-xs text-muted-foreground">Due {formatDate(settlementDate)}</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {formatCurrency(lumpSumAmount)}
            </p>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Already drawn: {formatCurrency(totalDrawsToDate)}</span>
            <span>Remaining: {formatCurrency(lumpSumAmount)}</span>
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            Redistributed mathematically across {daysUntilSettlement} days based on DD+7 sales trends
          </p>
        </div>

        {/* Daily Distribution Preview */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Next 7 Days Distribution</p>
          <div className="space-y-1">
            {dailyAmounts.slice(0, 7).map((day) => (
              <div key={day.date} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatCurrency(day.amount)}</span>
                  <span className="text-xs text-muted-foreground">
                    (Cumulative: {formatCurrency(day.cumulative)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-xs text-orange-800 dark:text-orange-200">
            Daily transfers reduce your upcoming settlement. The projected amount automatically adjusts when you transfer funds.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
