import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { VendorForm } from "./vendor-form";

interface PurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: Array<{
    id: string;
    name: string;
    paymentType: string;
    netTermsDays?: string;
    category?: string;
  }>;
  onSubmitOrder: (orderData: any) => void;
  onAddVendor?: (vendorData: any) => void;
}

interface PaymentSchedule {
  id: string;
  amount: string;
  dueDate: Date | undefined;
  description: string;
}

export const PurchaseOrderForm = ({ open, onOpenChange, vendors, onSubmitOrder, onAddVendor }: PurchaseOrderFormProps) => {
  // Get unique vendors for dropdown (no duplicates)
  const uniqueVendors = useMemo(() => {
    const vendorNames = new Set();
    return vendors.filter(vendor => {
      if (vendorNames.has(vendor.name)) {
        return false;
      }
      vendorNames.add(vendor.name);
      return true;
    });
  }, [vendors]);

  const [formData, setFormData] = useState({
    poName: "",
    vendor: "",
    amount: "",
    poDate: new Date(),
    dueDate: undefined as Date | undefined,
    deliveryDate: undefined as Date | undefined,
    description: "",
    category: "",
    notes: "",
    paymentType: "due-upon-order" as "due-upon-order" | "net-terms" | "preorder" | "due-upon-delivery",
    netTermsDays: "30" as "30" | "60" | "90" | "custom",
    customDays: ""
  });
  
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([
    { id: "1", amount: "", dueDate: undefined, description: "Initial deposit" }
  ]);

  const [isMainDatePickerOpen, setIsMainDatePickerOpen] = useState(false);
  const [isPODatePickerOpen, setIsPODatePickerOpen] = useState(false);
  const [isDeliveryDatePickerOpen, setIsDeliveryDatePickerOpen] = useState(false);
  const [openPaymentDatePickers, setOpenPaymentDatePickers] = useState<Record<string, boolean>>({});
  const [showVendorForm, setShowVendorForm] = useState(false);


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

  const calculateDueDate = () => {
    switch (formData.paymentType) {
      case "due-upon-order":
        return formData.poDate;
      case "net-terms":
        const days = formData.netTermsDays === "custom" 
          ? parseInt(formData.customDays) || 0 
          : parseInt(formData.netTermsDays);
        return addDays(formData.poDate, days);
      case "due-upon-delivery":
        return formData.deliveryDate;
      case "preorder":
        return undefined; // For preorder, due dates are in payment schedule
      default:
        return formData.poDate;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const calculatedDueDate = calculateDueDate();
    
    const orderData = {
      ...formData,
      dueDate: calculatedDueDate,
      paymentSchedule: formData.paymentType === "preorder" ? paymentSchedule : undefined
    };
    
    console.log("Submitting purchase order:", orderData);
    onSubmitOrder(orderData);
    toast.success(`Purchase Order "${formData.poName}" created successfully!`);
    onOpenChange(false);
    // Reset form
    setFormData({
      poName: "",
      vendor: "",
      amount: "",
      poDate: new Date(),
      dueDate: undefined,
      deliveryDate: undefined,
      description: "",
      category: "",
      notes: "",
      paymentType: "due-upon-order",
      netTermsDays: "30",
      customDays: ""
    });
    setPaymentSchedule([{ id: "1", amount: "", dueDate: undefined, description: "Initial deposit" }]);
  };

  const handleInputChange = (field: string, value: string | Date) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVendorChange = (vendorName: string) => {
    if (vendorName === "add-vendor") {
      setShowVendorForm(true);
      return;
    }
    
    const selectedVendor = vendors.find(v => v.name === vendorName);
    if (selectedVendor) {
      // Map vendor payment type to form payment type
      let mappedPaymentType: "due-upon-order" | "net-terms" | "preorder" | "due-upon-delivery" = "due-upon-order";
      
      if (selectedVendor.paymentType === 'total') {
        mappedPaymentType = "due-upon-order";
      } else if (selectedVendor.paymentType === 'net-terms') {
        mappedPaymentType = "net-terms";
      } else if (selectedVendor.paymentType === 'preorder') {
        mappedPaymentType = "preorder";
      } else if (selectedVendor.paymentType === 'due-upon-delivery') {
        mappedPaymentType = "due-upon-delivery";
      }
      
      setFormData(prev => ({ 
        ...prev, 
        vendor: vendorName,
        category: selectedVendor.category || "",
        paymentType: mappedPaymentType,
        netTermsDays: (selectedVendor.netTermsDays || "30") as "30" | "60" | "90" | "custom",
      }));
      
      // Set default deposit for preorder vendors
      if (mappedPaymentType === 'preorder') {
        setPaymentSchedule([{ 
          id: "1", 
          amount: "", 
          dueDate: undefined, 
          description: "Initial deposit" 
        }]);
      }
    } else {
      setFormData(prev => ({ ...prev, vendor: vendorName }));
    }
  };

  const handleAddVendorFromForm = (vendorData: any) => {
    if (onAddVendor) {
      onAddVendor(vendorData);
      // Map vendor payment type to form payment type
      let mappedPaymentType: "due-upon-order" | "net-terms" | "preorder" | "due-upon-delivery" = "due-upon-order";
      
      if (vendorData.paymentType === 'total') {
        mappedPaymentType = "due-upon-order";
      } else if (vendorData.paymentType === 'net-terms') {
        mappedPaymentType = "net-terms";
      } else if (vendorData.paymentType === 'preorder') {
        mappedPaymentType = "preorder";
      }
      
      // Auto-select the newly created vendor
      setFormData(prev => ({ 
        ...prev, 
        vendor: vendorData.name,
        category: vendorData.category || "",
        paymentType: mappedPaymentType,
        netTermsDays: (vendorData.netTermsDays || "30") as "30" | "60" | "90" | "custom",
      }));
    }
    setShowVendorForm(false);
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
            <Label htmlFor="vendor">Vendor</Label>
            <Select value={formData.vendor} onValueChange={handleVendorChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select vendor..." />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground border border-border shadow-lg">
                <SelectItem value="add-vendor" className="font-medium text-primary">
                  + Add New Vendor
                </SelectItem>
                {uniqueVendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.name}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="poName">PO Name *</Label>
            <Input
              id="poName"
              placeholder="e.g., Q1 Inventory Restock"
              value={formData.poName}
              onChange={(e) => handleInputChange("poName", e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>PO Date *</Label>
            <Popover open={isPODatePickerOpen} onOpenChange={setIsPODatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.poDate ? format(formData.poDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.poDate}
                  onSelect={(date) => {
                    handleInputChange("poDate", date || new Date());
                    setIsPODatePickerOpen(false);
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-3">
            <Label>Payment Terms</Label>
            <RadioGroup 
              value={formData.paymentType} 
              onValueChange={(value) => handleInputChange("paymentType", value)}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="due-upon-order" id="due-upon-order" />
                <Label htmlFor="due-upon-order">Due Upon Order</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="net-terms" id="net-terms" />
                <Label htmlFor="net-terms">Net Terms (30, 60, 90 days)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="preorder" id="preorder" />
                <Label htmlFor="preorder">Pre-order with Deposit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="due-upon-delivery" id="due-upon-delivery" />
                <Label htmlFor="due-upon-delivery">Due Upon Delivery</Label>
              </div>
            </RadioGroup>
          </div>

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

          {formData.paymentType === "due-upon-order" && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Due Date:</strong> {format(formData.poDate, "PPP")} (same as PO date)
              </p>
            </div>
          )}

          {formData.paymentType === "net-terms" ? (
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

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Due Date:</strong> {(() => {
                    const days = formData.netTermsDays === "custom" 
                      ? parseInt(formData.customDays) || 0 
                      : parseInt(formData.netTermsDays);
                    const dueDate = addDays(formData.poDate, days);
                    return format(dueDate, "PPP");
                  })()} ({formData.netTermsDays === "custom" ? formData.customDays : formData.netTermsDays} days from PO date)
                </p>
              </div>
            </div>
          ) : formData.paymentType === "due-upon-delivery" ? (
            <div className="space-y-2">
              <Label>Delivery Date *</Label>
              <Popover open={isDeliveryDatePickerOpen} onOpenChange={setIsDeliveryDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.deliveryDate ? format(formData.deliveryDate, "PPP") : "Pick delivery date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.deliveryDate}
                    onSelect={(date) => {
                      handleInputChange("deliveryDate", date || new Date());
                      setIsDeliveryDatePickerOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {formData.deliveryDate && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Due Date:</strong> {format(formData.deliveryDate, "PPP")} (same as delivery date)
                  </p>
                </div>
              )}
            </div>
          ) : formData.paymentType === "preorder" ? (
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
                          <Popover 
                            open={openPaymentDatePickers[payment.id] || false} 
                            onOpenChange={(open) => setOpenPaymentDatePickers(prev => ({ ...prev, [payment.id]: open }))}
                          >
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
                                onSelect={(date) => {
                                  updatePayment(payment.id, "dueDate", date);
                                  setOpenPaymentDatePickers(prev => ({ ...prev, [payment.id]: false }));
                                }}
                                initialFocus
                                className="p-3 pointer-events-auto"
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
          ) : null}
          
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
      
      <VendorForm 
        open={showVendorForm}
        onOpenChange={setShowVendorForm}
        onAddVendor={handleAddVendorFromForm}
      />
    </Dialog>
  );
};