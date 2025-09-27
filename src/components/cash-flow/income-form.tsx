import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CustomerForm } from "./customer-form";

interface Customer {
  id: string;
  name: string;
  paymentTerms?: string;
  netTermsDays?: number;
  category?: string;
}

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitIncome: (incomeData: any) => void;
  onSubmitExpense?: (expenseData: any) => void;
  isRecurring?: boolean;
  editingIncome?: any;
  customers?: Customer[];
  onAddCustomer?: (customerData: any) => void;
  onDeleteAllCustomers?: () => void;
}

export const IncomeForm = ({ 
  open, 
  onOpenChange, 
  onSubmitIncome, 
  onSubmitExpense, 
  isRecurring = false, 
  editingIncome,
  customers = [],
  onAddCustomer,
  onDeleteAllCustomers
}: IncomeFormProps) => {
  const [formData, setFormData] = useState({
    type: "income" as "income" | "expense",
    customer: "",
    customerId: "",
    description: editingIncome?.description || "",
    amount: editingIncome?.amount ? editingIncome.amount.toString() : "",
    paymentDate: editingIncome?.paymentDate || undefined as Date | undefined,
    category: editingIncome?.category || "",
    notes: editingIncome?.notes || "",
    isRecurring: editingIncome?.isRecurring || isRecurring,
    recurringFrequency: editingIncome?.recurringFrequency || "monthly" as "weekly" | "bi-weekly" | "monthly" | "quarterly" | "yearly" | "weekdays"
  });

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  // Filter customers based on search term and sort alphabetically
  const filteredCustomers = customers
    .filter(customer =>
      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Reset form when editingIncome changes
  useEffect(() => {
    if (editingIncome) {
      setFormData({
        type: "income",
        customer: editingIncome.customer || "",
        customerId: editingIncome.customerId || "",
        description: editingIncome.description || "",
        amount: editingIncome.amount ? editingIncome.amount.toString() : "",
        paymentDate: editingIncome.paymentDate || undefined,
        category: editingIncome.category || "",
        notes: editingIncome.notes || "",
        isRecurring: editingIncome.isRecurring || isRecurring,
        recurringFrequency: editingIncome.recurringFrequency || "monthly"
      });
      setCustomerSearchTerm(editingIncome.customer || "");
    } else {
      setFormData({
        type: "income",
        customer: "",
        customerId: "",
        description: "",
        amount: "",
        paymentDate: undefined,
        category: "",
        notes: "",
        isRecurring: isRecurring,
        recurringFrequency: "monthly"
      });
      setCustomerSearchTerm("");
    }
  }, [editingIncome, isRecurring]);

  const handleCustomerSelect = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      customer: customer.name,
      customerId: customer.id,
      category: customer.category || prev.category
    }));
    setCustomerSearchTerm(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleAddCustomerFromForm = async (customerData: any) => {
    if (onAddCustomer) {
      try {
        const newCustomer = await onAddCustomer({
          name: customerData.name,
          paymentTerms: customerData.paymentTerms,
          netTermsDays: customerData.netTermsDays ? parseInt(customerData.netTermsDays) : undefined
        });
        
        // Auto-select the new customer - use a temporary ID since we don't get the actual ID back
        setFormData(prev => ({
          ...prev,
          customer: customerData.name,
          customerId: `temp-${Date.now()}`
        }));
        
        setCustomerSearchTerm(customerData.name);
      } catch (error) {
        console.error('Error adding customer:', error);
      }
    }
    setShowCustomerForm(false);
  };

  const incomeCategories = [
    "Retail Partner",
    "Wholesale Client", 
    "Direct Consumer",
    "B2B Customer",
    "Distributor",
    "Other"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      id: editingIncome?.id || Date.now().toString(),
      ...formData,
      amount: parseFloat(formData.amount),
      paymentDate: formData.paymentDate || new Date(),
      status: editingIncome?.status || 'pending',
      customerId: formData.customerId || undefined
    };
    
    console.log("Submitting income:", data);
    
    onSubmitIncome(data);
    
    toast.success(`${isRecurring ? 'Recurring ' : ''}Income ${formData.description ? `"${formData.description}" ` : ''}${editingIncome ? 'updated' : 'added'} successfully!`);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      type: "income",
      customer: "",
      customerId: "",
      description: "",
      amount: "",
      paymentDate: undefined,
      category: "",
      notes: "",
      isRecurring: isRecurring,
      recurringFrequency: "monthly"
    });
  };

  const handleInputChange = (field: string, value: string | Date | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-y-auto",
        !formData.customerId ? "max-w-lg" : "max-w-md"
      )}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingIncome ? 'Edit Income' : (isRecurring ? 'Add Recurring Income' : 'Add Income')}
          </DialogTitle>
        </DialogHeader>
        
        {/* Step 1: Customer Selection */}
        {!formData.customerId && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold mb-2">Select a Customer</h3>
              <p className="text-sm text-muted-foreground">Choose a customer to add income</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="relative">
                    <Input
                      placeholder="Search or select customer..."
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        if (e.target.value) setShowCustomerDropdown(true);
                      }}
                      onClick={() => setShowCustomerDropdown(true)}
                      className="pr-8"
                    />
                    <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {showCustomerDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          {customerSearchTerm ? 'No customers found matching your search' : 'No customers available'}
                        </div>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className="p-2 hover:bg-accent cursor-pointer text-sm border-b last:border-b-0"
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <div className="font-medium">{customer.name}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {onAddCustomer && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowCustomerForm(true)}
                      className="px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {onDeleteAllCustomers && customers.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="px-3 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete All Customers</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete all {customers.length} customers? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={onDeleteAllCustomers}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Income Details */}
        {formData.customerId && (
          <>
            {/* Selected Customer Display */}
            <div className="p-3 bg-accent/20 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{formData.customer}</div>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, customer: "", customerId: "" }));
                    setCustomerSearchTerm("");
                  }}
                >
                  Change Customer
                </Button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.paymentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.paymentDate ? format(formData.paymentDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.paymentDate}
                      onSelect={(date) => {
                        handleInputChange("paymentDate", date || new Date());
                        setIsDatePickerOpen(false);
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="e.g., Monthly subscription revenue"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                />
              </div>

              {(formData.isRecurring || isRecurring) && (
                <div className="space-y-2">
                  <Label htmlFor="frequency">Recurring Frequency</Label>
                  <Select 
                    value={formData.recurringFrequency}
                    onValueChange={(value) => handleInputChange("recurringFrequency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly (Every 2 weeks)</SelectItem>
                      <SelectItem value="weekdays">Weekdays (Mon-Fri)</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
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
                  {editingIncome ? 'Update' : 'Add'} {isRecurring ? 'Recurring ' : ''}Income
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
      
      {/* Customer Form Modal */}
      <CustomerForm 
        open={showCustomerForm}
        onOpenChange={setShowCustomerForm}
        onAddCustomer={handleAddCustomerFromForm}
      />
    </Dialog>
  );
};