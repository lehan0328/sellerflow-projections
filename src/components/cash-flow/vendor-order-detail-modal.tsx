import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendors, type Vendor } from "@/hooks/useVendors";
import { toast } from "sonner";

interface VendorOrderDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
}

export const VendorOrderDetailModal = ({ open, onOpenChange, vendor }: VendorOrderDetailModalProps) => {
  const { updateVendor } = useVendors();
  const [formData, setFormData] = useState({
    totalOwed: vendor?.totalOwed || 0,
    nextPaymentAmount: vendor?.nextPaymentAmount || 0,
    nextPaymentDate: vendor?.nextPaymentDate ? new Date(vendor.nextPaymentDate).toISOString().split('T')[0] : '',
    poName: vendor?.poName || '',
    description: vendor?.description || '',
    notes: vendor?.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    try {
      await updateVendor(vendor.id, {
        totalOwed: Number(formData.totalOwed),
        nextPaymentAmount: Number(formData.nextPaymentAmount),
        nextPaymentDate: formData.nextPaymentDate ? new Date(formData.nextPaymentDate) : vendor.nextPaymentDate,
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

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Reset form when vendor changes
  React.useEffect(() => {
    if (vendor) {
      setFormData({
        totalOwed: vendor.totalOwed || 0,
        nextPaymentAmount: vendor.nextPaymentAmount || 0,
        nextPaymentDate: vendor.nextPaymentDate ? new Date(vendor.nextPaymentDate).toISOString().split('T')[0] : '',
        poName: vendor.poName || '',
        description: vendor.description || '',
        notes: vendor.notes || ''
      });
    }
  }, [vendor]);

  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Edit Order - {vendor.name}
          </DialogTitle>
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
          
          <div className="flex space-x-3 pt-4">
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