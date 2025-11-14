import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCreditCards } from "@/hooks/useCreditCards";
import { cn } from "@/lib/utils";

interface ChangeCreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  currentCreditCardId: string;
  transactionAmount: number;
  onSuccess?: () => void;
}

export const ChangeCreditCardDialog = ({ 
  open, 
  onOpenChange, 
  transactionId, 
  currentCreditCardId,
  transactionAmount,
  onSuccess 
}: ChangeCreditCardDialogProps) => {
  const { creditCards } = useCreditCards();
  const [selectedCardId, setSelectedCardId] = useState(currentCreditCardId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCardId || selectedCardId === currentCreditCardId) {
      toast.error("Please select a different credit card");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update the old card balance (reduce by amount since we're removing the charge)
      const { data: oldCard } = await supabase
        .from('credit_cards')
        .select('balance, credit_limit')
        .eq('id', currentCreditCardId)
        .single();

      if (oldCard) {
        const oldNewBalance = Math.max(0, oldCard.balance - transactionAmount);
        const oldNewAvailableCredit = oldCard.credit_limit - oldNewBalance;

        await supabase
          .from('credit_cards')
          .update({
            balance: oldNewBalance,
            available_credit: oldNewAvailableCredit
          })
          .eq('id', currentCreditCardId);
      }

      // Update the new card balance (add amount)
      const { data: newCard } = await supabase
        .from('credit_cards')
        .select('balance, credit_limit')
        .eq('id', selectedCardId)
        .single();

      if (newCard) {
        const newBalance = newCard.balance + transactionAmount;
        const newAvailableCredit = newCard.credit_limit - newBalance;

        await supabase
          .from('credit_cards')
          .update({
            balance: newBalance,
            available_credit: newAvailableCredit
          })
          .eq('id', selectedCardId);
      }

      // Update the transaction with new credit card
      const { error } = await supabase
        .from('transactions')
        .update({ credit_card_id: selectedCardId })
        .eq('id', transactionId);

      if (error) throw error;

      toast.success("Credit card updated successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating credit card:', error);
      toast.error("Failed to update credit card");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Change Credit Card
          </DialogTitle>
          <DialogDescription>
            Select a different credit card for this expense
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="creditCard">Credit Card</Label>
            <Select value={selectedCardId} onValueChange={setSelectedCardId}>
              <SelectTrigger>
                <SelectValue placeholder="Select credit card" />
              </SelectTrigger>
              <SelectContent>
                {creditCards.map(card => {
                  const availableCredit = (card.credit_limit || 0) - (card.balance || 0);
                  const isInsufficient = transactionAmount > availableCredit && card.id !== currentCreditCardId;
                  
                  return (
                    <SelectItem key={card.id} value={card.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>{card.account_name}</span>
                        </div>
                        <span className={cn(
                          "text-xs ml-2",
                          isInsufficient ? "text-destructive" : "text-muted-foreground"
                        )}>
                          ${availableCredit.toLocaleString()} available
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedCardId === currentCreditCardId}
            >
              {isSubmitting ? "Updating..." : "Update Card"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
