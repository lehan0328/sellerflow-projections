import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { useTransactions } from "@/hooks/useTransactions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

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

interface VendorOrderDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
}

export const VendorOrderDetailModal = ({ open, onOpenChange, vendor }: VendorOrderDetailModalProps) => {
  const { updateVendor } = useVendors();
  const { transactions, deleteTransaction, refetch } = useTransactions();
  
  // Track if we've fetched for this modal session
  const hasFetchedRef = React.useRef(false);
  
  // Refetch transactions only when modal initially opens
  React.useEffect(() => {
    if (open && !hasFetchedRef.current) {
      console.log('Modal opened for vendor:', vendor?.name, 'ID:', vendor?.id);
      refetch();
      hasFetchedRef.current = true;
    } else if (!open) {
      // Reset when modal closes
      hasFetchedRef.current = false;
    }
    // Intentionally excluding refetch from dependencies to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  
  const [formData, setFormData] = useState({
    totalOwed: vendor?.totalOwed || 0,
    nextPaymentAmount: vendor?.nextPaymentAmount || 0,
    nextPaymentDate: vendor?.nextPaymentDate ? formatDateInputLocal(vendor.nextPaymentDate) : '',
    poName: vendor?.poName || '',
    description: vendor?.description || '',
    notes: vendor?.notes || ''
  });

  const vendorTransactions = React.useMemo(() => {
    const filtered = transactions.filter(t => t.vendorId === vendor?.id);
    console.log('VendorOrderDetailModal Debug:', {
      vendorId: vendor?.id,
      vendorName: vendor?.name,
      totalTransactions: transactions.length,
      vendorTransactions: filtered.length,
      allTransactionVendorIds: transactions.map(t => ({ id: t.id, vendorId: t.vendorId, desc: t.description }))
    });
    return filtered;
  }, [transactions, vendor?.id]);
  const [selectedTxId, setSelectedTxId] = useState<string | undefined>(undefined);
  React.useEffect(() => {
    // Ensure a default selection if available and keep it in sync
    if (!selectedTxId || !vendorTransactions.some((t) => t.id === selectedTxId)) {
      setSelectedTxId(vendorTransactions[0]?.id);
    }
    console.debug("VendorOrderDetailModal", {
      vendor: vendor?.name,
      count: vendorTransactions.length,
      selectedTxId,
    });
  }, [vendorTransactions, open, selectedTxId, vendor?.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    try {
      const nextDate = formData.nextPaymentDate ? parseDateInputLocal(formData.nextPaymentDate) : vendor.nextPaymentDate;
      await updateVendor(vendor.id, {
        totalOwed: Number(formData.totalOwed),
        nextPaymentAmount: Number(formData.nextPaymentAmount),
        nextPaymentDate: nextDate,
        poName: formData.poName,
        description: formData.description,
        notes: formData.notes
      });

      toast.success("Vendor order updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update vendor order");
    }
  };

  const handleDeleteTransactionClick = async () => {
    const targetId = selectedTxId || vendorTransactions[0]?.id;
    if (!targetId) {
      toast.error("No transactions available to delete");
      return;
    }
    
    // Find the transaction to get its amount
    const transactionToDelete = vendorTransactions.find(t => t.id === targetId);
    if (!transactionToDelete) {
      toast.error("Transaction not found");
      return;
    }
    
    try {
      await deleteTransaction(targetId);
      await refetch();
      
      // Always update vendor's total owed by reducing the deleted transaction amount
      if (vendor) {
        const newTotalOwed = Math.max(0, vendor.totalOwed - transactionToDelete.amount);
        
        if (vendorTransactions.length === 1) {
          // This was the last transaction, mark as paid
          await updateVendor(vendor.id, { 
            totalOwed: 0,
            nextPaymentAmount: 0,
            status: 'paid'
          });
        } else {
          // Reduce total owed by the deleted transaction amount
          await updateVendor(vendor.id, { 
            totalOwed: newTotalOwed
          });
        }
      }
      
      onOpenChange(false);
      toast.success("Transaction deleted successfully");
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error("Failed to delete transaction");
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Track if form has been initialized for this modal session
  const hasInitializedFormRef = React.useRef(false);
  
  // Reset form only when modal first opens, not on realtime updates
  React.useEffect(() => {
    if (open && vendor && !hasInitializedFormRef.current) {
      setFormData({
        totalOwed: vendor.totalOwed || 0,
        nextPaymentAmount: vendor.nextPaymentAmount || 0,
        nextPaymentDate: vendor.nextPaymentDate ? formatDateInputLocal(vendor.nextPaymentDate) : '',
        poName: vendor.poName || '',
        description: vendor.description || '',
        notes: vendor.notes || ''
      });
      hasInitializedFormRef.current = true;
    } else if (!open) {
      // Reset flag when modal closes
      hasInitializedFormRef.current = false;
    }
  }, [open, vendor]);

  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Order - {vendor.name}</DialogTitle>
          <DialogDescription>Update order details or delete a specific transaction linked to this vendor.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totalOwed">Total Owed ($)</Label>
            <Input
              id="totalOwed"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.totalOwed}
              onChange={(e) => handleInputChange("totalOwed", parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextPaymentAmount">Next Payment Amount ($)</Label>
            <Input
              id="nextPaymentAmount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.nextPaymentAmount}
              onChange={(e) => handleInputChange("nextPaymentAmount", parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextPaymentDate">Next Payment Date</Label>
            <Input
              id="nextPaymentDate"
              type="date"
              value={formData.nextPaymentDate}
              onChange={(e) => handleInputChange("nextPaymentDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="poName">Purchase Order Name</Label>
            <Input
              id="poName"
              placeholder="Enter PO name/number"
              value={formData.poName}
              onChange={(e) => handleInputChange("poName", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Order description..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={2}
            />
          </div>
          
          {/* Transaction selection for deletion */}
          {vendorTransactions.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="transactionSelect">Select Transaction to Delete</Label>
              <Select value={selectedTxId || ""} onValueChange={(v) => setSelectedTxId(v)}>
                <SelectTrigger id="transactionSelect">
                  <SelectValue placeholder="Choose a transaction" />
                </SelectTrigger>
                <SelectContent>
                  {vendorTransactions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {`${new Date(t.transactionDate).toLocaleDateString()} • $${t.amount.toFixed(2)} • ${t.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                No transactions found for this vendor. 
                {transactions.length === 0 ? ' (No transactions loaded)' : ` (Found ${transactions.length} total transactions)`}
              </p>
              {vendor && (
                <p className="text-xs text-muted-foreground">
                  Looking for vendor ID: {vendor.id}
                </p>
              )}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="flex-1" onClick={() => setSelectedTxId(vendorTransactions[0]?.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Transaction
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this transaction? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                  <AlertDialogAction type="button" onClick={handleDeleteTransactionClick} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Transaction
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-primary">
              Update Order
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};