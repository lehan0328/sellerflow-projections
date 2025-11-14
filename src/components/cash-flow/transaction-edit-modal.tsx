import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VendorTransaction } from "@/hooks/useVendorTransactions";

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
  const [formData, setFormData] = useState({
    amount: 0,
    dueDate: '',
    description: '',
    remarks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && transaction) {
      setFormData({
        amount: transaction.amount || 0,
        dueDate: transaction.dueDate ? formatDateInputLocal(transaction.dueDate) : '',
        description: transaction.description || '',
        remarks: transaction.remarks || ''
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
        remarks: formData.remarks
      };

      if (formData.dueDate) {
        updates.due_date = formatDateForDB(parseDateInputLocal(formData.dueDate));
      }

      // If amount changed and this is a credit card expense, adjust credit card balance
      const amountChanged = Number(formData.amount) !== transaction.amount;
      if (amountChanged && transaction.creditCardId && transaction.status === 'completed') {
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Transaction</DialogTitle>
          <DialogDescription>Update transaction details for {transaction.vendorName}</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">PO# / Reference</Label>
            <Input
              id="description"
              placeholder="Enter PO or reference number"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
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
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleInputChange("dueDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Additional notes..."
              value={formData.remarks}
              onChange={(e) => handleInputChange("remarks", e.target.value)}
              rows={2}
            />
          </div>
          
          <div className="flex space-x-3 pt-2">
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
