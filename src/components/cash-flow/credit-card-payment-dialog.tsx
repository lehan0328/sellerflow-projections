import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

interface CreditCardPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditCardPaymentDialog({ open, onOpenChange }: CreditCardPaymentDialogProps) {
  const { user } = useAuth();
  const { creditCards, refetch: refetchCreditCards } = useCreditCards();
  const { accounts: bankAccounts, refetch: refetchBankAccounts } = useBankAccounts();
  
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string>("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCreditCard = creditCards.find(card => card.id === selectedCreditCardId);
  const selectedBankAccount = bankAccounts.find(account => account.id === selectedBankAccountId);

  const handleSubmit = async () => {
    if (!user || !selectedCreditCardId || !selectedBankAccountId || !paymentAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (!selectedCreditCard || !selectedBankAccount) {
      toast.error("Please select a credit card and bank account");
      return;
    }

    // Validate bank account has sufficient funds
    if (selectedBankAccount.available_balance && amount > selectedBankAccount.available_balance) {
      toast.error("Insufficient funds in selected bank account");
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
      const newBankBalance = selectedBankAccount.balance - amount;
      const newBankAvailable = (selectedBankAccount.available_balance || selectedBankAccount.balance) - amount;

      const { error: bankAccountError } = await supabase
        .from("bank_accounts")
        .update({
          balance: newBankBalance,
          available_balance: newBankAvailable,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedBankAccountId);

      if (bankAccountError) throw bankAccountError;

      toast.success(`Payment of $${amount.toFixed(2)} recorded successfully`);
      
      // Refresh data
      await Promise.all([refetchCreditCards(), refetchBankAccounts()]);
      
      // Reset form and close
      setSelectedCreditCardId("");
      setSelectedBankAccountId("");
      setPaymentAmount("");
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
            Record a payment from your bank account to a credit card
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
                Available Credit: ${selectedCreditCard.available_credit.toFixed(2)}
              </p>
            )}
          </div>

          {/* Select Bank Account */}
          <div className="space-y-2">
            <Label htmlFor="bank-account">Pay From Bank Account</Label>
            <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
              <SelectTrigger id="bank-account">
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_name} - Available: ${(account.available_balance || account.balance).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {selectedCreditCard && selectedBankAccount && paymentAmount && (
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  New Credit Card Balance: ${(selectedCreditCard.balance - parseFloat(paymentAmount || "0")).toFixed(2)}
                </p>
                <p className="text-muted-foreground">
                  New Available Credit: ${(selectedCreditCard.available_credit + parseFloat(paymentAmount || "0")).toFixed(2)}
                </p>
                <p className="text-muted-foreground">
                  New Bank Balance: ${((selectedBankAccount.available_balance || selectedBankAccount.balance) - parseFloat(paymentAmount || "0")).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedCreditCardId || !selectedBankAccountId || !paymentAmount}>
            {isSubmitting ? "Processing..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
