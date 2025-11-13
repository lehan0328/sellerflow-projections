import { useState } from "react";
import { format, addMonths, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { Calendar, X, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generateRecurringDates } from "@/lib/recurringDates";
import { useRecurringExpenseExceptions } from "@/hooks/useRecurringExpenseExceptions";
import type { RecurringExpense } from "@/hooks/useRecurringExpenses";

interface RecurringExpenseScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurringExpense: RecurringExpense;
}

export function RecurringExpenseScheduleDialog({
  open,
  onOpenChange,
  recurringExpense,
}: RecurringExpenseScheduleDialogProps) {
  const [skipDate, setSkipDate] = useState<{ date: Date; dateStr: string } | null>(null);
  const [restoreException, setRestoreException] = useState<{ id: string; date: string } | null>(null);

  const { exceptions, createException, deleteException } = useRecurringExpenseExceptions(
    recurringExpense.id
  );

  // Generate dates for next 3 months
  const today = new Date();
  const endDate = endOfMonth(addMonths(today, 2));
  
  // Convert exception dates to Date objects for filtering
  const exceptionDates = exceptions.map(ex => new Date(ex.exception_date));
  
  const allDates = generateRecurringDates(
    {
      id: recurringExpense.id,
      transaction_name: recurringExpense.transaction_name || recurringExpense.name,
      amount: recurringExpense.amount,
      frequency: recurringExpense.frequency,
      start_date: recurringExpense.start_date,
      end_date: recurringExpense.end_date,
      is_active: recurringExpense.is_active,
      type: recurringExpense.type,
    },
    today,
    endDate
  );

  // Group dates by month
  const datesByMonth = allDates.reduce((acc, date) => {
    const monthKey = format(date, 'yyyy-MM');
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(date);
    return acc;
  }, {} as Record<string, Date[]>);

  const handleSkip = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSkipDate({ date, dateStr });
  };

  const confirmSkip = () => {
    if (skipDate) {
      createException({
        recurringExpenseId: recurringExpense.id,
        exceptionDate: skipDate.dateStr,
      });
      setSkipDate(null);
    }
  };

  const handleRestore = (exceptionId: string, date: string) => {
    setRestoreException({ id: exceptionId, date });
  };

  const confirmRestore = () => {
    if (restoreException) {
      deleteException(restoreException.id);
      setRestoreException(null);
    }
  };

  const isDateSkipped = (date: Date) => {
    return exceptions.some(ex => {
      const exDate = new Date(ex.exception_date);
      return format(exDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  };

  const getExceptionForDate = (date: Date) => {
    return exceptions.find(ex => {
      const exDate = new Date(ex.exception_date);
      return format(exDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  };

  const getMonthTotal = (dates: Date[]) => {
    return dates.filter(date => !isDateSkipped(date)).length * recurringExpense.amount;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule: {recurringExpense.name}
            </DialogTitle>
            <DialogDescription>
              View and manage upcoming occurrences for the next 3 months. Skip individual dates without deleting the recurring transaction.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-6">
              {Object.entries(datesByMonth).map(([monthKey, dates]) => {
                const monthDate = new Date(monthKey + '-01');
                const monthTotal = getMonthTotal(dates);
                const activeCount = dates.filter(date => !isDateSkipped(date)).length;
                const skippedCount = dates.filter(date => isDateSkipped(date)).length;

                return (
                  <div key={monthKey} className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-semibold text-lg">
                        {format(monthDate, 'MMMM yyyy')}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">
                          ${monthTotal.toFixed(2)}
                        </span>
                        {' '}({activeCount} active{skippedCount > 0 && `, ${skippedCount} skipped`})
                      </div>
                    </div>

                    <div className="space-y-2">
                      {dates.map((date) => {
                        const isSkipped = isDateSkipped(date);
                        const exception = getExceptionForDate(date);

                        return (
                          <div
                            key={date.toISOString()}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isSkipped
                                ? 'bg-muted/50 border-muted'
                                : 'bg-card border-border'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-sm">
                                <div className="font-medium">
                                  {format(date, 'EEE, MMM d, yyyy')}
                                </div>
                                <div className="text-muted-foreground">
                                  ${recurringExpense.amount.toFixed(2)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isSkipped ? (
                                <>
                                  <Badge variant="secondary" className="gap-1">
                                    <X className="h-3 w-3" />
                                    Skipped
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => exception && handleRestore(exception.id, format(date, 'MMM d, yyyy'))}
                                    className="gap-1"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    Restore
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSkip(date)}
                                  className="gap-1 text-destructive hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                  Skip
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {Object.keys(datesByMonth).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming occurrences found for the next 3 months.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Skip Confirmation Dialog */}
      <AlertDialog open={!!skipDate} onOpenChange={(open) => !open && setSkipDate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this occurrence?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to skip the payment for{' '}
              <span className="font-semibold">
                {skipDate && format(skipDate.date, 'EEEE, MMMM d, yyyy')}
              </span>?
              <br /><br />
              This won't delete the recurring transaction - you can restore this date later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSkip}>
              Skip Date
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreException} onOpenChange={(open) => !open && setRestoreException(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this occurrence?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore the payment for{' '}
              <span className="font-semibold">{restoreException?.date}</span>?
              <br /><br />
              This will add it back to your recurring schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>
              Restore Date
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
