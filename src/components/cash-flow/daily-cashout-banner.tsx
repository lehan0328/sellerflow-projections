import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, parseISO } from "date-fns";

interface DailyCashoutBannerProps {
  amazonAccountId: string;
  forecastedPayouts: Array<{
    payout_date: string;
    total_amount: number;
  }>;
  onCashoutMarked?: () => void;
}

export function DailyCashoutBanner({ 
  amazonAccountId, 
  forecastedPayouts,
  onCashoutMarked 
}: DailyCashoutBannerProps) {
  const [missingCashoutDate, setMissingCashoutDate] = useState<string | null>(null);
  const [potentialRollover, setPotentialRollover] = useState<number>(0);
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    checkForMissingCashout();
  }, [amazonAccountId, forecastedPayouts]);

  const checkForMissingCashout = async () => {
    try {
      // Check yesterday's date
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');

      // Check if there's a cashout recorded for yesterday
      const { data: cashouts } = await supabase
        .from('amazon_daily_draws')
        .select('draw_date')
        .eq('amazon_account_id', amazonAccountId)
        .gte('draw_date', yesterday)
        .lte('draw_date', today);

      // If no cashout for yesterday, check if there's a forecast for yesterday
      if (!cashouts || cashouts.length === 0) {
        const yesterdayForecast = forecastedPayouts.find(
          f => f.payout_date === yesterday
        );

        if (yesterdayForecast) {
          setMissingCashoutDate(yesterday);
          setPotentialRollover(yesterdayForecast.total_amount);
        }
      } else {
        setMissingCashoutDate(null);
        setPotentialRollover(0);
      }
    } catch (error) {
      console.error('Error checking for missing cashout:', error);
    }
  };

  const markCashoutOccurred = async () => {
    if (!missingCashoutDate) return;

    setIsMarking(true);
    try {
      // Get the forecasted amount for that date
      const forecastForDate = forecastedPayouts.find(
        f => f.payout_date === missingCashoutDate
      );

      if (!forecastForDate) {
        throw new Error('No forecast found for this date');
      }

      // Record the cashout in amazon_daily_draws
      const { error } = await supabase.functions.invoke('record-daily-draw', {
        body: {
          amazonAccountId,
          amount: forecastForDate.total_amount,
          drawDate: missingCashoutDate,
          settlementId: `manual_cashout_${missingCashoutDate}`
        }
      });

      if (error) throw error;

      toast.success(`Cashout recorded for ${format(parseISO(missingCashoutDate), 'MMM d')}`);
      setMissingCashoutDate(null);
      setPotentialRollover(0);
      
      if (onCashoutMarked) {
        onCashoutMarked();
      }
    } catch (error: any) {
      console.error('Error marking cashout:', error);
      toast.error(error.message || 'Failed to mark cashout');
    } finally {
      setIsMarking(false);
    }
  };

  const markNoCashout = () => {
    // User confirms no cashout happened, so we acknowledge the rollover
    setMissingCashoutDate(null);
    setPotentialRollover(0);
    toast.info('Note: Your available balance may be higher due to rollover');
  };

  if (!missingCashoutDate) return null;

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-amber-900">
                Daily Cashout Not Detected
              </h3>
              <p className="text-sm text-amber-800 mt-1">
                We didn't detect a cashout for {format(parseISO(missingCashoutDate), 'MMMM d, yyyy')}. 
                If you didn't cash out, your available balance should include both yesterday's 
                and today's amounts (${potentialRollover.toFixed(2)} + today's forecast).
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={markCashoutOccurred}
                disabled={isMarking}
                size="sm"
                variant="outline"
                className="border-amber-600 text-amber-900 hover:bg-amber-100"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                {isMarking ? 'Recording...' : 'I Did Cash Out'}
              </Button>
              <Button
                onClick={markNoCashout}
                size="sm"
                variant="ghost"
                className="text-amber-900 hover:bg-amber-100"
              >
                No Cashout (Rollover)
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
