import { useState, useMemo } from "react";
import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CreditCard, CalendarIcon, Info } from "lucide-react";
import { format, startOfDay, addDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/calendarBalances";

interface CreditCardPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allBuyingOpportunities?: Array<{ date: string; balance: number; available_date?: string }>;
  projectedDailyBalances?: Array<{ date: string; runningBalance: number }>;
  reserveAmount?: number;
  allCalendarEvents?: CalendarEvent[];
  onPaymentSuccess?: () => void;
  lowestCreditByCard?: Record<string, { date: string; credit: number }>;
  cardOpportunities?: Record<string, Array<{ date: string; availableCredit: number }>>;
}

export function CreditCardPaymentDialog({ 
  open, 
  onOpenChange, 
  allBuyingOpportunities = [],
  projectedDailyBalances = [],
  reserveAmount = 0,
  allCalendarEvents = [],
  onPaymentSuccess,
  lowestCreditByCard = {},
  cardOpportunities = {}
}: CreditCardPaymentDialogProps) {
  const { user } = useAuth();
  const { creditCards, creditCardPendingAmounts, refetch: refetchCreditCards } = useCreditCards();
  const { accounts: bankAccounts, refetch: refetchBankAccounts } = useBankAccounts();
  
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const selectedCreditCard = creditCards.find(card => card.id === selectedCreditCardId);

  // Use pre-calculated lowest credit from cash-flow-insights modal
  const lowestCreditDate = selectedCreditCardId ? lowestCreditByCard[selectedCreditCardId] : null;

  // Get buying opportunities for the selected card
  const selectedCardOpportunities = selectedCreditCardId ? cardOpportunities[selectedCreditCardId] || [] : [];

  // Calculate projected available credit on selected date for selected card
  const projectedAvailableCredit = useMemo(() => {
    if (!selectedCreditCardId || !paymentDate || !selectedCreditCard) return null;

    const today = startOfDay(new Date());
    const targetDate = startOfDay(paymentDate);

    // Start with current available credit
    const currentAvailableCredit = (selectedCreditCard.credit_limit_override || selectedCreditCard.credit_limit) - (selectedCreditCard.statement_balance || selectedCreditCard.balance);
    let projectedCredit = currentAvailableCredit;

    // Only process future events (after today) to avoid double-counting
    const futureEvents = allCalendarEvents.filter(event => {
      const eventDate = startOfDay(new Date(event.date));
      return eventDate > today && eventDate <= targetDate;
    });

    // Process events that affect this specific card
    futureEvents.forEach(event => {
      if (event.creditCardId === selectedCreditCardId) {
        if (event.type === 'credit-payment') {
          // Payment increases available credit
          projectedCredit += event.amount;
        } else {
          // Purchase decreases available credit
          projectedCredit -= event.amount;
        }
      }
    });

    return projectedCredit;
  }, [selectedCreditCardId, paymentDate, selectedCreditCard, allCalendarEvents]);

  // Calculate projected cash balance on selected date
  const projectedCashBalance = useMemo(() => {
    if (!paymentDate || projectedDailyBalances.length === 0) return null;

    const dateStr = format(paymentDate, "yyyy-MM-dd");
    const dailyBalance = projectedDailyBalances.find(db => db.date === dateStr);
    
    return dailyBalance ? dailyBalance.runningBalance : null;
  }, [paymentDate, projectedDailyBalances]);

  // Auto-suggest earliest affordable date based on payment amount
  const suggestedDate = React.useMemo(() => {
    if (!allBuyingOpportunities || allBuyingOpportunities.length === 0) return null;
    if (!projectedDailyBalances || projectedDailyBalances.length === 0) return null;
    
    const targetAmount = parseFloat(paymentAmount || "0");
    if (targetAmount <= 0) return null;
    
    // Total required = payment amount + reserve
    const totalRequired = targetAmount + reserveAmount;
    
    // Find ALL opportunities with sufficient balance
    const matchingOpps = allBuyingOpportunities.filter(opp => {
      // First check: opportunity balance must be >= payment amount
      if (opp.balance < targetAmount) return false;
      
      // Second check: actual projected balance on that date must be >= payment + reserve
      const dateStr = opp.available_date || opp.date;
      const projectedBalance = projectedDailyBalances.find(d => d.date === dateStr);
      
      return projectedBalance && projectedBalance.runningBalance >= totalRequired;
    });
    
    // Sort by available_date to find the earliest one
    const opportunity = matchingOpps.length > 0
      ? matchingOpps.sort((a, b) => {
          const dateA = new Date(a.available_date || a.date).getTime();
          const dateB = new Date(b.available_date || b.date).getTime();
          return dateA - dateB;
        })[0]
      : null;
    
    return opportunity;
  }, [allBuyingOpportunities, paymentAmount, projectedDailyBalances, reserveAmount]);

  const defaultBankAccount = bankAccounts[0];
  
  // Calculate adjusted available credit (respecting extended credit limit override)
  const getAdjustedAvailableCredit = (card: typeof selectedCreditCard) => {
    if (!card) return 0;
    const effectiveCreditLimit = card.credit_limit_override || card.credit_limit;
    const pendingAmount = creditCardPendingAmounts.get(card.id) || 0;
    return Math.max(0, effectiveCreditLimit - card.balance - pendingAmount);
  };

  const handleSubmit = async () => {
    if (!user || !selectedCreditCardId || !paymentAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (!selectedCreditCard || !defaultBankAccount) {
      toast.error("Please select a credit card");
      return;
    }

    setIsSubmitting(true);

    try {
      // Fetch user's account_id from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .single();

      // Insert into credit_card_payments table
      const { error } = await supabase
        .from("credit_card_payments")
        .insert({
          user_id: user.id,
          account_id: profile?.account_id,
          bank_account_id: defaultBankAccount.id,
          credit_card_id: selectedCreditCardId,
          amount: amount,
          payment_date: format(paymentDate, "yyyy-MM-dd"),
          description: `Credit Card Payment - ${selectedCreditCard.account_name}`,
          payment_type: 'manual',
          status: 'scheduled'
        });

      if (error) throw error;

      toast.success(`Payment of $${amount.toFixed(2)} scheduled for ${format(paymentDate, "PPP")}`);
      
      // Refresh data
      await Promise.all([refetchCreditCards(), refetchBankAccounts()]);
      
      // Trigger parent refetch
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
      
      // Reset form and close
      setSelectedCreditCardId("");
      setPaymentAmount("");
      setPaymentDate(new Date());
      onOpenChange(false);
      
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay Credit Card
          </DialogTitle>
          <DialogDescription>
            Record a payment from your bank account to a credit card. Note: Available credit shown reflects pending transactions from the last 30 days only, so it may differ from what you see in the graph.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Select Credit Card */}
          <div className="space-y-2">
            <Label htmlFor="credit-card">Credit Card</Label>
            <Select value={selectedCreditCardId} onValueChange={setSelectedCreditCardId}>
              <SelectTrigger id="credit-card">
                <SelectValue placeholder="Select credit card" />
              </SelectTrigger>
              <SelectContent>
                {creditCards
                  .filter(card => card.is_active)
                  .sort((a, b) => (a.priority || 3) - (b.priority || 3))
                  .map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {card.priority || 3}
                      </span>
                      <span>{card.account_name}</span>
                      <span className="text-sm text-muted-foreground ml-auto">
                        Balance: ${card.balance.toFixed(2)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCreditCard && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Credit Limit: ${(selectedCreditCard.credit_limit_override || selectedCreditCard.credit_limit).toFixed(2)} | 
                  Available Credit: ${getAdjustedAvailableCredit(selectedCreditCard).toFixed(2)}
                </p>
                {selectedCreditCard.payment_due_date && (
                  <p className="text-sm text-muted-foreground">
                    Payment Due Date: {format(new Date(selectedCreditCard.payment_due_date), "MMM dd, yyyy")}
                  </p>
                )}
                {lowestCreditDate && (
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    Lowest Credit (30 days): ${lowestCreditDate.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} on {format(parseISO(lowestCreditDate.date), 'MMM d, yyyy')}
                  </p>
                )}
                {selectedCardOpportunities.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Buying Opportunities ({selectedCardOpportunities.length} available)</p>
                    {selectedCardOpportunities.slice(0, 2).map((opp, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{format(parseISO(opp.date), 'MMM d')}</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          ${opp.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    {selectedCardOpportunities.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{selectedCardOpportunities.length - 2} more opportunities
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => {
                    if (date) {
                      setPaymentDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {/* Display projected balances */}
            {selectedCreditCardId && paymentDate && (projectedAvailableCredit !== null || projectedCashBalance !== null) && (
              <div className={cn(
                "mt-2 p-3 rounded-md flex items-start gap-2",
                projectedAvailableCredit !== null && projectedAvailableCredit >= 0 
                  ? "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800" 
                  : "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
              )}>
                <Info className={cn(
                  "h-4 w-4 mt-0.5 flex-shrink-0",
                  projectedAvailableCredit !== null && projectedAvailableCredit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
                )} />
                <div className="flex-1 text-sm space-y-2">
                  <div>
                    <p className={cn(
                      "font-medium",
                      projectedAvailableCredit !== null && projectedAvailableCredit >= 0 ? "text-blue-900 dark:text-blue-100" : "text-red-900 dark:text-red-100"
                    )}>
                      On {format(paymentDate, "MMM d, yyyy")}:
                    </p>
                  </div>
                  
                  {projectedCashBalance !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Projected Cash:</span>
                      <span className="font-semibold text-foreground">
                        ${projectedCashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  
                  {projectedAvailableCredit !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Available Credit:</span>
                      <span className={cn(
                        "font-semibold",
                        projectedAvailableCredit >= 0 ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"
                      )}>
                        ${projectedAvailableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Payment Amount</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedCreditCardId || !paymentAmount}>
            {isSubmitting ? "Processing..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
