import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

interface PurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaymentSchedule {
  id: string;
  amount: string;
  dueDate: Date | undefined;
  description: string;
}

export const PurchaseOrderForm = ({ open, onOpenChange }: PurchaseOrderFormProps) => {
  const [formData, setFormData] = useState({
    poName: "",
    supplier: "",
    amount: "",
    dueDate: undefined as Date | undefined,
    description: "",
    category: "",
    notes: "",
    paymentType: "total" as "total" | "preorder"
  });
  
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([
    { id: "1", amount: "", dueDate: undefined, description: "Initial deposit" }
  ]);

  const suppliers = [
    "Global Supplier Co.",
    "Amazon Advertising",
    "Inventory Plus LLC",
    "Packaging Solutions Inc.",
    "Logistics Partners",
  ];

  const categories = [
    "Inventory Purchase",
    "Packaging Materials",
    "Marketing/PPC",
    "Shipping & Logistics",
    "Professional Services",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Purchase Order submitted:", {
      ...formData,
      paymentSchedule: formData.paymentType === "preorder" ? paymentSchedule : undefined
    });
    onOpenChange(false);
    // Reset form
    setFormData({
      poName: "",
      supplier: "",
      amount: "",
      dueDate: undefined,
      description: "",
      category: "",
      notes: "",
      paymentType: "total"
    });
    setPaymentSchedule([{ id: "1", amount: "", dueDate: undefined, description: "Initial deposit" }]);
  };

  const handleInputChange = (field: string, value: string | Date) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Add Purchase Order
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="poName">PO Name (Optional)</Label>
            <Input
              id="poName"
              placeholder="e.g., Q1 Inventory Restock"
              value={formData.poName}
              onChange={(e) => handleInputChange("poName", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Select onValueChange={(value) => handleInputChange("supplier", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select or enter supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier} value={supplier}>
                    {supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Payment Type</Label>
            <Select onValueChange={(value) => handleInputChange("paymentType", value)} defaultValue="total">
              <SelectTrigger>
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Total Amount Due</SelectItem>
                <SelectItem value="preorder">Pre-order w/ Deposit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.paymentType === "total" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Total Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
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
                      {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => handleInputChange("dueDate", date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Order Amount ($)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  required
                />
              </div>

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
            <Select onValueChange={(value) => handleInputChange("category", value)}>
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
              placeholder="Brief description of the purchase"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              required
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
          
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-primary">
              Add Purchase Order
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};