import { useState } from "react";
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
import { useCategories } from "@/hooks/useCategories";
import { AddCategoryDialog } from "./add-category-dialog";
import { cn } from "@/lib/utils";

interface SalesOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Array<{
    id: string;
    name: string;
    paymentTerms: string;
    netTermsDays?: string;
  }>;
  onSubmitOrder: (orderData: any) => void;
}

interface PaymentSchedule {
  id: string;
  amount: string;
  dueDate: Date | undefined;
  description: string;
}

export const SalesOrderForm = ({ open, onOpenChange, customers, onSubmitOrder }: SalesOrderFormProps) => {
  const { categories: incomeCategories, addCategory } = useCategories('income', false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [formData, setFormData] = useState({
    soName: "",
    customer: "",
    amount: "",
    dueDate: undefined as Date | undefined,
    category: "",
    notes: "",
    paymentType: "total" as "total" | "preorder" | "net-terms",
    netTermsDays: "30" as "30" | "45" | "60" | "custom",
    customDays: ""
  });
  
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([
    { id: "1", amount: "", dueDate: undefined, description: "Initial payment" }
  ]);

  const [isMainDatePickerOpen, setIsMainDatePickerOpen] = useState(false);
  const [openPaymentDatePickers, setOpenPaymentDatePickers] = useState<Record<string, boolean>>({});

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
    
    const salesOrder = {
      id: Date.now().toString(),
      ...formData,
      paymentSchedule: formData.paymentType === "preorder" ? paymentSchedule : undefined
    };
    
    console.log("Submitting sales order:", salesOrder);
    onSubmitOrder(salesOrder);
    toast.success(`Sales Order "${formData.soName}" created successfully!`);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      soName: "",
      customer: "",
      amount: "",
      dueDate: undefined,
      category: "",
      notes: "",
      paymentType: "total",
      netTermsDays: "30",
      customDays: ""
    });
    setPaymentSchedule([{ id: "1", amount: "", dueDate: undefined, description: "Initial payment" }]);
  };

  const handleInputChange = (field: string, value: string | Date) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomerChange = (customerName: string) => {
    const selectedCustomer = customers.find(c => c.name === customerName);
    if (selectedCustomer) {
      setFormData(prev => ({ 
        ...prev, 
        customer: customerName,
        paymentType: selectedCustomer.paymentTerms === 'net' ? 'net-terms' : 'total',
        netTermsDays: (selectedCustomer.netTermsDays || "30") as "30" | "45" | "60" | "custom",
      }));
    } else {
      setFormData(prev => ({ ...prev, customer: customerName }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Add Sales Order
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.name}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="soName">Sales Order Name *</Label>
              <Input
                id="soName"
                placeholder="e.g., Q1 Product Sales"
                value={formData.soName}
                onChange={(e) => handleInputChange("soName", e.target.value)}
                required
              />
            </div>
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
                <Label htmlFor="preorder">Installment Payments</Label>
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
                <Popover open={isMainDatePickerOpen} onOpenChange={setIsMainDatePickerOpen}>
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
                      onSelect={(date) => {
                        handleInputChange("dueDate", date || new Date());
                        setIsMainDatePickerOpen(false);
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          ) : formData.paymentType === "net-terms" ? (
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
                    <RadioGroupItem value="45" id="net45" />
                    <Label htmlFor="net45">Net 45</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="60" id="net60" />
                    <Label htmlFor="net60">Net 60</Label>
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
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      
                      <div>
                        <Label>Description</Label>
                        <Input
                          placeholder={index === 0 ? "Initial payment" : "Payment description"}
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
            <Label htmlFor="category">Category *</Label>
            <Select 
              value={formData.category}
              onValueChange={(value) => {
                if (value === "__add_new__") {
                  setShowAddCategory(true);
                } else {
                  handleInputChange("category", value);
                }
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <div className="border-b pb-1 mb-1">
                  <SelectItem value="__add_new__" className="text-primary font-medium">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add New Category
                    </div>
                  </SelectItem>
                </div>
                {incomeCategories.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    <div className="flex items-center justify-between w-full">
                      <span>{category.name}</span>
                      {category.is_default && (
                        <span className="text-xs text-muted-foreground ml-2">(default)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              Add Sales Order
            </Button>
          </div>
        </form>
      </DialogContent>
      
      <AddCategoryDialog
        open={showAddCategory}
        onOpenChange={setShowAddCategory}
        onAddCategory={async (name) => {
          await addCategory(name);
          handleInputChange("category", name);
        }}
        type="income"
      />
    </Dialog>
  );
};