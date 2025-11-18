import { useState } from "react";
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
import { CreditCard, CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SearchByAmountDialog } from "./search-by-amount-dialog";

interface CreditCardPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allBuyingOpportunities?: Array<{ date: string; balance: number; available_date?: string }>;
}

export function CreditCardPaymentDialog({ open, onOpenChange, allBuyingOpportunities = [] }: CreditCardPaymentDialogProps) {
  const { user } = useAuth();
  const { creditCards, creditCardPendingAmounts, refetch: refetchCreditCards } = useCreditCards();
  const { accounts: bankAccounts, refetch: refetchBankAccounts } = useBankAccounts();
  
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);

  const selectedCreditCard = creditCards.find(card => card.id === selectedCreditCardId);
  const defaultBankAccount = bankAccounts[0];
  
  // Calculate adjusted available credit (respecting extended buying power)
  const getAdjustedAvailableCredit = (card: typeof selectedCreditCard) => {
    if (!card) return 0;
    const pendingAmount = creditCardPendingAmounts.get(card.id) || 0;
    return card.available_credit - pendingAmount;
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

    // Validate bank account has sufficient funds
    if (defaultBankAccount.available_balance && amount > defaultBankAccount.available_balance) {
      toast.error("Insufficient funds in bank account");
      return;
    }

    // Validate payment doesn't exceed credit card balance
    if (amount > selectedCreditCard.balance) {
      toast.error("Payment amount exceeds credit card balance");
      return;
    }

    setIsSubmitting(true);

    try {
      // Update credit card balance (decrease balance, increase available credit)
      const newCreditCardBalance = selectedCreditCard.balance - amount;
      const newAvailableCredit = selectedCreditCard.available_credit + amount;

      const { error: creditCardError } = await supabase
        .from("credit_cards")
        .update({
          balance: newCreditCardBalance,
          available_credit: newAvailableCredit,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedCreditCardId);

      if (creditCardError) throw creditCardError;

      // Update bank account balance (decrease available balance)
      const newBankBalance = defaultBankAccount.balance - amount;
      const newBankAvailable = (defaultBankAccount.available_balance || defaultBankAccount.balance) - amount;

      const { error: bankAccountError } = await supabase
        .from("bank_accounts")
        .update({
          balance: newBankBalance,
          available_balance: newBankAvailable,
          updated_at: new Date().toISOString()
        })
        .eq("id", defaultBankAccount.id);

      if (bankAccountError) throw bankAccountError;

      // Record the transaction in bank_transactions table
      const { error: transactionError } = await supabase
        .from("bank_transactions")
        .insert({
          user_id: user.id,
          bank_account_id: defaultBankAccount.id,
          credit_card_id: selectedCreditCardId,
          amount: -amount, // Negative because money is leaving the bank account
          date: format(paymentDate, "yyyy-MM-dd"),
          name: `Credit Card Payment - ${selectedCreditCard.account_name}`,
          merchant_name: selectedCreditCard.institution_name,
          pending: false,
          plaid_transaction_id: `manual_cc_payment_${Date.now()}`,
          transaction_type: "payment",
          category: ["Credit Card Payment"]
        });

      if (transactionError) {
        console.error("Error recording transaction:", transactionError);
        // Don't throw here - the payment was already recorded
      }

      toast.success(`Payment of $${amount.toFixed(2)} recorded successfully`);
      
      // Refresh data
      await Promise.all([refetchCreditCards(), refetchBankAccounts()]);
      
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
                {creditCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.account_name} - Balance: ${card.balance.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCreditCard && (
              <p className="text-sm text-muted-foreground">
                Current Balance: ${selectedCreditCard.balance.toFixed(2)} | 
                Available Credit: ${getAdjustedAvailableCredit(selectedCreditCard).toFixed(2)}
              </p>
            )}
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Payment Amount</Label>
            <div className="flex gap-2">
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              {allBuyingOpportunities.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSearchDialog(true)}
                  title="Search when you can afford this payment"
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>
            {selectedCreditCard && defaultBankAccount && paymentAmount && (
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  New Credit Card Balance: ${(selectedCreditCard.balance - parseFloat(paymentAmount || "0")).toFixed(2)}
                </p>
                <p className="text-muted-foreground">
                  New Available Credit: ${(selectedCreditCard.available_credit + parseFloat(paymentAmount || "0")).toFixed(2)}
                </p>
                <p className="text-muted-foreground">
                  New Bank Balance: ${((defaultBankAccount.available_balance || defaultBankAccount.balance) - parseFloat(paymentAmount || "0")).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Popover>
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
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
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

      <SearchByAmountDialog
        open={showSearchDialog}
        onOpenChange={setShowSearchDialog}
        allBuyingOpportunities={allBuyingOpportunities}
        onSelectDate={(date) => setPaymentDate(date)}
      />
    </Dialog>
  );
}
