import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, AlertCircle } from "lucide-react";

interface SearchByAmountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allBuyingOpportunities: Array<{ date: string; balance: number; available_date?: string }>;
  onSelectDate?: (date: Date) => void;
}

export function SearchByAmountDialog({
  open,
  onOpenChange,
  allBuyingOpportunities,
  onSelectDate
}: SearchByAmountDialogProps) {
  const [searchAmount, setSearchAmount] = useState('');

  const handleSelectDate = (dateStr: string) => {
    if (onSelectDate) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      onSelectDate(date);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Search by Amount
          </DialogTitle>
          <DialogDescription>
            Enter an amount to find the earliest date you can afford it based on your projected cash flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search-amount">Enter amount you want to spend</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="search-amount"
                  type="number"
                  placeholder="0.00"
                  value={searchAmount}
                  onChange={(e) => setSearchAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            {searchAmount && parseFloat(searchAmount) > 0 ? (
              <div className="space-y-3">
                {(() => {
                  const amount = parseFloat(searchAmount);
                  // Find the earliest opportunity where balance >= amount
                  const matchingOpp = allBuyingOpportunities.find(opp => opp.balance >= amount);

                  if (!matchingOpp) {
                    return (
                      <div className="text-center p-8 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No opportunities found for ${searchAmount}</p>
                        <p className="text-sm mt-2">Try a lower amount or check back later</p>
                      </div>
                    );
                  }

                  const [year, month, day] = matchingOpp.date.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  const formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  let availableDate = '';
                  let availableDateObj: Date | null = null;
                  if (matchingOpp.available_date) {
                    const [aYear, aMonth, aDay] = matchingOpp.available_date.split('-').map(Number);
                    availableDateObj = new Date(aYear, aMonth - 1, aDay);
                    availableDate = availableDateObj.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                  }

                  return (
                    <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/30 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            ${matchingOpp.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-muted-foreground">Available</div>
                        </div>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                          Can afford ${searchAmount}
                        </Badge>
                      </div>
                      <Separator className="my-2" />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Low Point Date:</span>
                          <span className="font-medium">{formattedDate}</span>
                        </div>
                        {availableDate && (
                          <div className="flex justify-between items-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                            <div className="flex-1">
                              <span className="text-blue-700 dark:text-blue-400 font-medium">Earliest Payment Date:</span>
                              <span className="ml-2 font-bold text-blue-600">{availableDate}</span>
                            </div>
                            {onSelectDate && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSelectDate(matchingOpp.available_date || matchingOpp.date)}
                                className="ml-2 h-7 px-2 text-xs hover:bg-blue-200 dark:hover:bg-blue-900/50"
                              >
                                Use This Date
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Enter an amount above to see when you can afford it</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
