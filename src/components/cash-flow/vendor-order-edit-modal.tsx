import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface Vendor {
  id: string;
  name: string;
  totalOwed: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
  status: 'current' | 'overdue' | 'upcoming';
  category: string;
}

interface PaymentSchedule {
  id: string;
  amount: string;
  dueDate: Date | undefined;
  description: string;
}

interface VendorOrderEditModalProps {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (vendor: Vendor) => void;
}

export const VendorOrderEditModal = ({ vendor, open, onOpenChange, onSave }: VendorOrderEditModalProps) => {
  const [formData, setFormData] = useState({
    poName: "",
    description: "",
    category: vendor?.category || "",
    notes: "",
    paymentType: "total" as "total" | "preorder" | "net-terms",
    netTermsDays: "30" as "30" | "60" | "90" | "custom",
    customDays: ""
  });

  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([
    { 
      id: "1", 
      amount: vendor?.nextPaymentAmount.toString() || "", 
      dueDate: vendor?.nextPaymentDate, 
      description: "Next payment" 
    }
  ]);

  const [editedVendor, setEditedVendor] = useState<Vendor | null>(vendor);

  // Update editedVendor when vendor prop changes
  useEffect(() => {
    console.log('VendorOrderEditModal: vendor prop changed to:', vendor);
    setEditedVendor(vendor);
  }, [vendor]);

  // Update form data when vendor changes
  useEffect(() => {
    if (vendor) {
      console.log('VendorOrderEditModal: updating form data for vendor:', vendor);
      setFormData(prev => ({
        ...prev,
        category: vendor.category || "",
      }));
      
      setPaymentSchedule([
        { 
          id: "1", 
          amount: vendor.nextPaymentAmount.toString(), 
          dueDate: vendor.nextPaymentDate, 
          description: "Next payment" 
        }
      ]);
    }
  }, [vendor]);

  const categories = [
    "Inventory",
    "Marketing", 
    "Packaging",
    "Shipping",
    "Services",
    "Other"
  ];

  const addPayment = () => {
    const newPayment: PaymentSchedule = {
      id: Date.now().toString(),
      amount: "",
      dueDate: undefined,
      description: ""
    };
    setPaymentSchedule([...paymentSchedule, newPayment]);
  };

  const removePayment = (id: string) => {
    if (paymentSchedule.length > 1) {
      setPaymentSchedule(paymentSchedule.filter(p => p.id !== id));
    }
  };

  const updatePayment = (id: string, field: keyof PaymentSchedule, value: any) => {
    setPaymentSchedule(paymentSchedule.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleInputChange = (field: string, value: string | Date) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVendorChange = (field: keyof Vendor, value: any) => {
    if (!editedVendor) return;
    setEditedVendor({
      ...editedVendor,
      [field]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedVendor) return;

    // Calculate new total owed based on payment schedule
    const totalScheduledPayments = paymentSchedule.reduce((sum, payment) => 
      sum + (parseFloat(payment.amount) || 0), 0
    );

    // Update vendor with new payment structure
    const updatedVendor = {
      ...editedVendor,
      totalOwed: totalScheduledPayments,
      nextPaymentAmount: parseFloat(paymentSchedule[0]?.amount || "0"),
      nextPaymentDate: paymentSchedule[0]?.dueDate || new Date(),
      category: formData.category
    };

    onSave(updatedVendor);
    toast.success("Vendor order updated successfully");
    onOpenChange(false);
  };

  if (!vendor || !editedVendor) {
    console.log('VendorOrderEditModal: returning null because vendor or editedVendor is null', { vendor, editedVendor });
    return null;
  }

  console.log('VendorOrderEditModal: rendering modal for vendor:', vendor.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Edit Vendor Order - {vendor.name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendor-name">Vendor Name</Label>
            <Input
              id="vendor-name"
              value={editedVendor.name}
              onChange={(e) => handleVendorChange('name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="poName">Order Name (Optional)</Label>
            <Input
              id="poName"
              placeholder="e.g., Q1 Inventory Restock"
              value={formData.poName}
              onChange={(e) => handleInputChange("poName", e.target.value)}
            />
          </div>
          
          <div className="space-y-3">
            <Label>Payment Type</Label>
            <RadioGroup 
              value={formData.paymentType} 
              onValueChange={(value) => handleInputChange("paymentType", value)}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="total" id="total" />
                <Label htmlFor="total">Total Amount Due</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="preorder" id="preorder" />
                <Label htmlFor="preorder">Pre-order w/ Deposit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="net-terms" id="net-terms" />
                <Label htmlFor="net-terms">Net Terms</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.paymentType === "total" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="totalOwed">Total Amount ($)</Label>
                <Input
                  id="totalOwed"
                  type="number"
                  value={editedVendor.totalOwed}
                  onChange={(e) => handleVendorChange('totalOwed', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editedVendor.nextPaymentDate ? format(editedVendor.nextPaymentDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editedVendor.nextPaymentDate}
                      onSelect={(date) => handleVendorChange("nextPaymentDate", date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          ) : formData.paymentType === "net-terms" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="totalOwed">Total Amount ($)</Label>
                <Input
                  id="totalOwed"
                  type="number"
                  value={editedVendor.totalOwed}
                  onChange={(e) => handleVendorChange('totalOwed', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Net Terms</Label>
                <RadioGroup 
                  value={formData.netTermsDays} 
                  onValueChange={(value) => handleInputChange("netTermsDays", value)}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="30" id="net30" />
                    <Label htmlFor="net30">Net 30</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="60" id="net60" />
                    <Label htmlFor="net60">Net 60</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="90" id="net90" />
                    <Label htmlFor="net90">Net 90</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom">Custom</Label>
                  </div>
                </RadioGroup>

                {formData.netTermsDays === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="customDays">Custom Days</Label>
                    <Input
                      id="customDays"
                      type="number"
                      placeholder="Enter days"
                      value={formData.customDays}
                      onChange={(e) => handleInputChange("customDays", e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  Due Date: {(() => {
                    const days = formData.netTermsDays === "custom" 
                      ? parseInt(formData.customDays) || 0 
                      : parseInt(formData.netTermsDays);
                    const dueDate = addDays(new Date(), days);
                    return format(dueDate, "PPP");
                  })()}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Payment Schedule</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addPayment}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Payment
                  </Button>
                </div>
                
                {paymentSchedule.map((payment, index) => (
                  <Card key={payment.id} className="p-4">
                    <CardContent className="p-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Payment {index + 1}</h4>
                        {paymentSchedule.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removePayment(payment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Amount ($)</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={payment.amount}
                            onChange={(e) => updatePayment(payment.id, "amount", e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label>Due Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {payment.dueDate ? format(payment.dueDate, "MMM d") : "Pick date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={payment.dueDate}
                                onSelect={(date) => updatePayment(payment.id, "dueDate", date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      
                      <div>
                        <Label>Description</Label>
                        <Input
                          placeholder={index === 0 ? "Initial deposit" : "Payment description"}
                          value={payment.description}
                          onChange={(e) => updatePayment(payment.id, "description", e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category}
              onValueChange={(value) => handleInputChange("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief description of the order"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or details"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={editedVendor.status}
              onValueChange={(value: 'current' | 'overdue' | 'upcoming') => handleVendorChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-primary">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};