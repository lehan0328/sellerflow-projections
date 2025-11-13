import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategories } from "@/hooks/useCategories";
import { AddCategoryDialog } from "./add-category-dialog";
import { Plus, TrendingUp, TrendingDown, CreditCard, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CustomerForm } from "./customer-form";
import { PayeeForm } from "./payee-form";
import { useCreditCards } from "@/hooks/useCreditCards";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Customer {
  id: string;
  name: string;
  paymentTerms?: string;
  netTermsDays?: number;
  category?: string;
}

interface Payee {
  id: string;
  name: string;
  category?: string;
  payment_method?: string;
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
  payees?: Payee[];
  onAddPayee?: (payeeData: any) => void;
  initialType?: "income" | "expense";
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
  payees = [],
  onAddPayee,
  initialType = "income"
}: IncomeFormProps) => {
  const { categories: incomeCategories, addCategory: addIncomeCategory, refetch: refetchIncomeCategories } = useCategories('income', isRecurring);
  const { categories: expenseCategories, addCategory: addExpenseCategory, refetch: refetchExpenseCategories } = useCategories('expense', isRecurring);
  const { creditCards } = useCreditCards();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [formData, setFormData] = useState({
    type: initialType as "income" | "expense",
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
    recurringFrequency: editingIncome?.recurringFrequency || "monthly" as "daily" | "weekly" | "bi-weekly" | "monthly" | "2-months" | "3-months" | "weekdays",
    paymentMethod: "bank-transfer" as "bank-transfer" | "credit-card",
    creditCardId: editingIncome?.creditCardId || ""
  });

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showPayeeDropdown, setShowPayeeDropdown] = useState(false);
  const [payeeSearchTerm, setPayeeSearchTerm] = useState("");
  const [showPayeeForm, setShowPayeeForm] = useState(false);
  const [selectedPayeeId, setSelectedPayeeId] = useState("");

  // Filter customers based on search term and sort alphabetically
  const filteredCustomers = customers
    .filter(customer =>
      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Filter payees based on search term and sort alphabetically
  const filteredPayees = payees
    .filter(payee =>
      payee.name.toLowerCase().includes(payeeSearchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Reset form when editingIncome changes
  useEffect(() => {
    if (editingIncome) {
      setFormData({
        type: editingIncome.type || initialType,
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
        recurringFrequency: editingIncome.recurringFrequency || "monthly",
        paymentMethod: "bank-transfer",
        creditCardId: ""
      });
      setCustomerSearchTerm(editingIncome.customer || "");
    } else {
      setFormData({
        type: initialType,
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
        recurringFrequency: "monthly",
        paymentMethod: "bank-transfer",
        creditCardId: ""
      });
      setCustomerSearchTerm("");
    }
  }, [editingIncome, isRecurring, initialType]);

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

  const handlePayeeSelect = (payee: Payee) => {
    setSelectedPayeeId(payee.id);
    const newPaymentMethod = (payee.payment_method === "credit-card" ? "credit-card" : "bank-transfer") as "bank-transfer" | "credit-card";
    setFormData(prev => ({
      ...prev,
      description: payee.name,
      category: payee.category || prev.category,
      paymentMethod: newPaymentMethod,
      creditCardId: newPaymentMethod === "bank-transfer" ? "" : prev.creditCardId
    }));
    setPayeeSearchTerm(payee.name);
    setShowPayeeDropdown(false);
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

  const handleAddPayeeFromForm = async (payeeData: any) => {
    if (onAddPayee) {
      try {
        const newPayee = await onAddPayee({
          name: payeeData.name,
          category: payeeData.category || '',
          payment_method: payeeData.payment_method,
          notes: payeeData.notes
        });
        
        // Auto-select the new payee and import their category
        setSelectedPayeeId(`temp-${Date.now()}`);
        setFormData(prev => ({
          ...prev,
          description: payeeData.name,
          category: payeeData.category || ''
        }));
        
        setPayeeSearchTerm(payeeData.name);
      } catch (error) {
        console.error('Error adding payee:', error);
      }
    }
    setShowPayeeForm(false);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate credit card selection for expenses with credit card payment
    if (formData.type === "expense" && formData.paymentMethod === "credit-card" && !formData.creditCardId) {
      toast.error("Please select a credit card");
      return;
    }
    
    const data = {
      id: editingIncome?.id || Date.now().toString(),
      ...formData,
      amount: parseFloat(formData.amount),
      paymentDate: formData.paymentDate || new Date(),
      status: editingIncome?.status || 'pending',
      customerId: formData.customerId || undefined,
      creditCardId: (formData.type === "expense" && formData.paymentMethod === "credit-card") ? formData.creditCardId : undefined
    };
    
    console.log("Submitting:", data);
    
    // Call the appropriate submit function based on type
    if (formData.type === "expense" && onSubmitExpense) {
      await onSubmitExpense(data);
      toast.success("Expense added successfully!");
    } else {
      await onSubmitIncome(data);
      toast.success("Income added successfully!");
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
      recurringFrequency: "monthly",
      paymentMethod: "bank-transfer",
      creditCardId: ""
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
            {editingIncome ? `Edit ${formData.type === "expense" ? "Expense" : "Income"}` : (isRecurring ? `Add Recurring ${formData.type === "expense" ? "Expense" : "Income"}` : `Add ${formData.type === "expense" ? "Expense" : "Income"}`)}
          </DialogTitle>
        </DialogHeader>
        
        {/* Step 1: Customer Selection (skip for recurring and expenses) */}
        {!formData.customerId && !formData.isRecurring && formData.type === "income" && (
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
        
        {/* Step 1: Payee Selection (for expenses) */}
        {!selectedPayeeId && !formData.isRecurring && formData.type === "expense" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold mb-2">Select a Payee</h3>
              <p className="text-sm text-muted-foreground">Choose a payee to add expense</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payee">Payee *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="relative">
                    <Input
                      placeholder="Search or select payee..."
                      value={payeeSearchTerm}
                      onChange={(e) => {
                        setPayeeSearchTerm(e.target.value);
                        if (e.target.value) setShowPayeeDropdown(true);
                      }}
                      onClick={() => setShowPayeeDropdown(true)}
                      className="pr-8"
                    />
                    <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {showPayeeDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredPayees.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          {payeeSearchTerm ? 'No payees found matching your search' : 'No payees available'}
                        </div>
                      ) : (
                        filteredPayees.map((payee) => (
                          <div
                            key={payee.id}
                            className="p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                            onClick={() => handlePayeeSelect(payee)}
                          >
                            <div className="font-medium text-sm">{payee.name}</div>
                            {payee.category && (
                              <div className="text-xs text-muted-foreground mt-0.5">{payee.category}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                {onAddPayee && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowPayeeForm(true)}
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
        {(formData.customerId || selectedPayeeId || formData.isRecurring || (formData.type === "expense" && selectedPayeeId)) && (
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
            
            {/* Selected Payee Display - only show if not recurring */}
            {selectedPayeeId && !formData.isRecurring && (
              <div className="p-3 bg-accent/20 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Input
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Payee name"
                      className="font-medium bg-transparent border-none shadow-none p-0 h-auto focus-visible:ring-0"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedPayeeId(null);
                      setFormData(prev => ({ ...prev, description: "" }));
                      setPayeeSearchTerm("");
                    }}
                  >
                    Change Payee
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
                    <Label>Due Date *</Label>
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

              {/* Credit Card Payment Method - for all expenses */}
              {formData.type === "expense" && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Payment Method *</Label>
                    <div className="flex gap-1.5 p-0.5 bg-muted rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange("paymentMethod", "bank-transfer");
                          handleInputChange("creditCardId", "");
                        }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all",
                          formData.paymentMethod === "bank-transfer"
                            ? "bg-background shadow-sm text-foreground border"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange("paymentMethod", "credit-card")}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all",
                          formData.paymentMethod === "credit-card"
                            ? "bg-background shadow-sm text-foreground border"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Credit Card
                      </button>
                    </div>
                  </div>

                  {formData.paymentMethod === "credit-card" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="creditCard">Select Credit Card *</Label>
                        <Select 
                          value={formData.creditCardId}
                          onValueChange={(value) => handleInputChange("creditCardId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a credit card" />
                          </SelectTrigger>
                          <SelectContent>
                            {creditCards.map(card => {
                              const availableCredit = (card.credit_limit || 0) - (card.balance || 0);
                              const amount = parseFloat(formData.amount) || 0;
                              const isInsufficient = amount > availableCredit;
                              
                              return (
                                <SelectItem key={card.id} value={card.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                      <CreditCard className="h-4 w-4" />
                                      <span>{card.account_name}</span>
                                    </div>
                                    <span className={cn(
                                      "text-xs ml-2",
                                      isInsufficient ? "text-destructive" : "text-muted-foreground"
                                    )}>
                                      ${availableCredit.toLocaleString()} available
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.creditCardId && formData.amount && (() => {
                        const selectedCard = creditCards.find(c => c.id === formData.creditCardId);
                        if (selectedCard) {
                          const availableCredit = (selectedCard.credit_limit || 0) - (selectedCard.balance || 0);
                          const amount = parseFloat(formData.amount) || 0;
                          if (amount > availableCredit) {
                            return (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  This amount (${amount.toLocaleString()}) exceeds the available credit (${availableCredit.toLocaleString()}) on this card. You can still proceed, but ensure credit is available when the charge occurs.
                                </AlertDescription>
                              </Alert>
                            );
                          }
                        }
                        return null;
                      })()}
                    </>
                  )}
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
              
              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-gradient-primary"
                >
                  {editingIncome ? 'Update' : 'Add'} {isRecurring ? 'Recurring ' : ''}{formData.type === "expense" ? "Expense" : "Income"}
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
      {onAddCustomer && (
      <CustomerForm
        open={showCustomerForm}
        onOpenChange={setShowCustomerForm}
        onAddCustomer={handleAddCustomerFromForm}
        onCategoryAdded={refetchIncomeCategories}
      />
      )}

      {/* Payee Form Modal */}
      {onAddPayee && (
        <PayeeForm 
          open={showPayeeForm}
          onOpenChange={setShowPayeeForm}
          onAddPayee={handleAddPayeeFromForm}
          existingPayees={payees}
          onCategoryAdded={refetchExpenseCategories}
        />
      )}
    </Dialog>
  );
};