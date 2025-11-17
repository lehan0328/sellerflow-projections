import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VendorTransaction } from "@/hooks/useVendorTransactions";
import { useCreditCards } from "@/hooks/useCreditCards";
import { cn } from "@/lib/utils";

// Helpers to handle local date formatting/parsing to avoid timezone shifts
const formatDateInputLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDateInputLocal = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatDateForDB = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface TransactionEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: VendorTransaction | null;
  onSuccess?: () => void;
}

export const TransactionEditModal = ({ open, onOpenChange, transaction, onSuccess }: TransactionEditModalProps) => {
  const { creditCards } = useCreditCards();
  const [formData, setFormData] = useState({
    amount: 0,
    dueDate: '',
    description: '',
    remarks: '',
    creditCardId: null as string | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && transaction) {
      // Handle dueDate whether it's a Date object or string
      let dueDateValue = '';
      if (transaction.dueDate) {
        if (transaction.dueDate instanceof Date) {
          dueDateValue = formatDateInputLocal(transaction.dueDate);
        } else if (typeof transaction.dueDate === 'string') {
          // Parse string date and format for input
          const parsedDate = new Date(transaction.dueDate);
          dueDateValue = formatDateInputLocal(parsedDate);
        }
      }
      
      setFormData({
        amount: transaction.amount || 0,
        dueDate: dueDateValue,
        description: transaction.description || '',
        remarks: transaction.remarks || '',
        creditCardId: transaction.creditCardId || null
      });
    }
  }, [open, transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    setIsSubmitting(true);
    try {
      const updates: any = {
        amount: Number(formData.amount),
        description: formData.description,
        remarks: formData.remarks,
        credit_card_id: formData.creditCardId
      };

      if (formData.dueDate) {
        updates.due_date = formatDateForDB(parseDateInputLocal(formData.dueDate));
      }

      // Handle credit card balance changes
      const amountChanged = Number(formData.amount) !== transaction.amount;
      const cardChanged = formData.creditCardId !== transaction.creditCardId;

      if (transaction.status === 'completed') {
        // If card changed, update both old and new card balances
        if (cardChanged) {
          // Restore balance to old card if there was one
          if (transaction.creditCardId) {
            const { data: oldCard } = await supabase
              .from('credit_cards')
              .select('balance, credit_limit')
              .eq('id', transaction.creditCardId)
              .single();
            
            if (oldCard) {
              const newOldBalance = oldCard.balance - transaction.amount;
              const newOldAvailable = oldCard.credit_limit - newOldBalance;
              
              await supabase
                .from('credit_cards')
                .update({
                  balance: newOldBalance,
                  available_credit: newOldAvailable
                })
                .eq('id', transaction.creditCardId);
            }
          }

          // Add balance to new card if there is one
          if (formData.creditCardId) {
            const { data: newCard } = await supabase
              .from('credit_cards')
              .select('balance, credit_limit')
              .eq('id', formData.creditCardId)
              .single();
            
            if (newCard) {
              const newNewBalance = newCard.balance + Number(formData.amount);
              const newNewAvailable = newCard.credit_limit - newNewBalance;
              
              await supabase
                .from('credit_cards')
                .update({
                  balance: newNewBalance,
                  available_credit: newNewAvailable
                })
                .eq('id', formData.creditCardId);
            }
          }
        } 
        // If only amount changed and there's a credit card, adjust its balance
        else if (amountChanged && transaction.creditCardId) {
          const { data: creditCard } = await supabase
            .from('credit_cards')
            .select('balance, credit_limit')
            .eq('id', transaction.creditCardId)
            .single();
          
          if (creditCard) {
            const amountDifference = Number(formData.amount) - transaction.amount;
            const newBalance = creditCard.balance + amountDifference;
            const newAvailableCredit = creditCard.credit_limit - newBalance;
            
            await supabase
              .from('credit_cards')
              .update({
                balance: newBalance,
                available_credit: newAvailableCredit
              })
              .eq('id', transaction.creditCardId);
          }
        }
      }

      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transaction.id);

      if (error) throw error;

      toast.success("Transaction updated successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error("Failed to update transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Transaction</DialogTitle>
          <DialogDescription>Update transaction details for {transaction.vendorName}</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto pr-4 pl-4 flex-1">
            <div className="space-y-2">
              <Label htmlFor="description">Payee</Label>
              <Input
                id="description"
                placeholder="Payee name"
                value={formData.description}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditCard">Payment Method</Label>
              <Select 
                value={formData.creditCardId || 'cash'} 
                onValueChange={(value) => handleInputChange("creditCardId", value === 'cash' ? null : value)}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[100] bg-popover text-popover-foreground border border-border shadow-lg max-h-[200px]">
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <span>Cash / Bank</span>
                    </div>
                  </SelectItem>
                  {creditCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="truncate max-w-[250px]">{card.account_name}</span>
                        <span className="text-xs text-muted-foreground">
                          Available: ${card.available_credit?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? (
                      format(parseDateInputLocal(formData.dueDate), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate ? parseDateInputLocal(formData.dueDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        handleInputChange("dueDate", formatDateInputLocal(date));
                      }
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Additional notes..."
                value={formData.remarks}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4 mt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
