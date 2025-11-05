import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategories } from "@/hooks/useCategories";
import { AddCategoryDialog } from "./add-category-dialog";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search } from "lucide-react";
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
}

export const IncomeForm = ({ 
  open, 
  onOpenChange, 
  onSubmitIncome, 
  onSubmitExpense, 
  isRecurring = false, 
  editingIncome,
  customers = [],
  onAddCustomer
}: IncomeFormProps) => {
  const { categories: incomeCategories, addCategory: addIncomeCategory } = useCategories('income', isRecurring);
  const { categories: expenseCategories, addCategory: addExpenseCategory } = useCategories('expense', isRecurring);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [formData, setFormData] = useState({
    type: "income" as "income" | "expense",
    customer: "",
    customerId: "",
    transactionName: editingIncome?.transactionName || "",
    description: editingIncome?.description || "",
    amount: editingIncome?.amount ? editingIncome.amount.toString() : "",
    paymentDate: editingIncome?.paymentDate || undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    category: editingIncome?.category || "",
    notes: editingIncome?.notes || "",
    isRecurring: editingIncome?.isRecurring || isRecurring,
    recurringFrequency: editingIncome?.recurringFrequency || "monthly" as "daily" | "weekly" | "bi-weekly" | "monthly" | "2-months" | "3-months" | "weekdays"
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
        transactionName: editingIncome.transactionName || "",
        description: editingIncome.description || "",
        amount: editingIncome.amount ? editingIncome.amount.toString() : "",
        paymentDate: editingIncome.paymentDate || undefined,
        endDate: undefined,
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
        transactionName: "",
        description: "",
        amount: "",
        paymentDate: undefined,
        endDate: undefined,
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
          category: customerData.category || '',
          paymentTerms: customerData.paymentTerms,
          netTermsDays: customerData.netTermsDays ? parseInt(customerData.netTermsDays) : undefined
        });
        
        // Auto-select the new customer and import their category
        setFormData(prev => ({
          ...prev,
          customer: customerData.name,
          customerId: `temp-${Date.now()}`,
          category: customerData.category || ''
        }));
        
        setCustomerSearchTerm(customerData.name);
      } catch (error) {
        console.error('Error adding customer:', error);
      }
    }
    setShowCustomerForm(false);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      id: editingIncome?.id || Date.now().toString(),
      ...formData,
      amount: parseFloat(formData.amount),
      paymentDate: formData.paymentDate || new Date(),
      status: editingIncome?.status || 'pending',
      customerId: formData.customerId || undefined
    };
    
    console.log("Submitting:", data);
    
    // Call the appropriate submit function based on type
    if (formData.type === "expense" && onSubmitExpense) {
      await onSubmitExpense(data);
    } else {
      await onSubmitIncome(data);
    }
    
    // Only close and reset if successful (the hook will show the appropriate toast)
    onOpenChange(false);
    
    // Reset form
    setFormData({
      type: "income",
      customer: "",
      customerId: "",
      transactionName: "",
      description: "",
      amount: "",
      paymentDate: undefined,
      endDate: undefined,
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
        !formData.customerId ? "max-w-lg" : "max-w-3xl w-full"
      )}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {formData.type === "income" ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            {editingIncome ? `Edit ${formData.type === "expense" ? "Expense" : "Income"}` : (isRecurring ? `Add Recurring ${formData.type === "expense" ? "Expense" : "Income"}` : 'Add Income')}
          </DialogTitle>
        </DialogHeader>
        
        {/* Step 1: Customer Selection (skip for recurring) */}
        {!formData.customerId && !formData.isRecurring && (
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
                            className="p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <div className="font-medium text-sm">{customer.name}</div>
                            {customer.category && (
                              <div className="text-xs text-muted-foreground mt-0.5">{customer.category}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
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
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Income/Expense Details */}
        {(formData.customerId || formData.isRecurring) && (
          <>
            {/* Selected Customer Display - only show if not recurring */}
            {formData.customerId && !formData.isRecurring && (
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
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type toggle for recurring entries */}
              {formData.isRecurring && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Transaction Type *</Label>
              <div className="flex gap-1.5 p-0.5 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => handleInputChange("type", "income")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all",
                    formData.type === "income"
                      ? "bg-background shadow-sm text-green-600 border border-green-200"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange("type", "expense")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all",
                    formData.type === "expense"
                      ? "bg-background shadow-sm text-red-600 border border-red-200"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TrendingDown className="h-3.5 w-3.5" />
                  Expense
                </button>
              </div>
                </div>
              )}
              {/* Transaction Name and Amount - for recurring only */}
              {(formData.isRecurring || isRecurring) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transactionName">Transaction Name *</Label>
                    <Input
                      id="transactionName"
                      placeholder="e.g., Office Rent, Monthly Salary"
                      value={formData.transactionName}
                      onChange={(e) => handleInputChange("transactionName", e.target.value)}
                      required
                    />
                  </div>

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
                </div>
              )}

              {/* Amount and Receiving Date - for non-recurring only */}
              {!(formData.isRecurring || isRecurring) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount-single">Amount ($) *</Label>
                    <Input
                      id="amount-single"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => handleInputChange("amount", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Receiving Date *</Label>
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
                </div>
              )}

              {/* Date fields - for recurring only */}
              {(formData.isRecurring || isRecurring) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
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
                    <Label>End Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate ? format(formData.endDate, "PPP") : "No end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => handleInputChange("endDate", date || undefined)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {/* Frequency - only for recurring */}
              {(formData.isRecurring || isRecurring) && (
                <div className="space-y-2">
                  <Label htmlFor="frequency">Recurring Frequency *</Label>
                  <Select 
                    value={formData.recurringFrequency}
                    onValueChange={(value) => handleInputChange("recurringFrequency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekdays">Weekdays (Mon-Fri)</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly (Every 2 weeks)</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="2-months">Every 2 Months</SelectItem>
                      <SelectItem value="3-months">Every 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Category */}
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
                    {(formData.type === "income" ? incomeCategories : expenseCategories).map(category => (
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
                <Button 
                  type="submit" 
                  className="flex-1 bg-gradient-primary"
                >
                  {editingIncome ? 'Update' : 'Add'} {isRecurring ? 'Recurring ' : ''}{formData.isRecurring ? (formData.type === "expense" ? "Expense" : "Income") : "Income"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
      
      {/* Add Category Dialog */}
      <AddCategoryDialog
        open={showAddCategory}
        onOpenChange={setShowAddCategory}
        onAddCategory={async (name) => {
          const addFn = formData.type === "income" ? addIncomeCategory : addExpenseCategory;
          await addFn(name, isRecurring);
          // Capitalize first letter to match what's saved in the database
          const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
          handleInputChange("category", capitalizedName);
        }}
        type={formData.type}
      />
      
      {/* Customer Form Modal */}
      <CustomerForm 
        open={showCustomerForm}
        onOpenChange={setShowCustomerForm}
        onAddCustomer={handleAddCustomerFromForm}
      />
    </Dialog>
  );
};