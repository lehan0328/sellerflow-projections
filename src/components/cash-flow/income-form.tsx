import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitIncome: (incomeData: any) => void;
  onSubmitExpense?: (expenseData: any) => void;
  isRecurring?: boolean;
  editingIncome?: any;
}

export const IncomeForm = ({ open, onOpenChange, onSubmitIncome, onSubmitExpense, isRecurring = false, editingIncome }: IncomeFormProps) => {
  const [formData, setFormData] = useState({
    type: "income" as "income" | "expense",
    description: editingIncome?.description || "",
    amount: editingIncome?.amount ? editingIncome.amount.toString() : "",
    paymentDate: editingIncome?.paymentDate || undefined as Date | undefined,
    category: editingIncome?.category || "",
    notes: editingIncome?.notes || "",
    isRecurring: editingIncome?.isRecurring || isRecurring,
    recurringFrequency: editingIncome?.recurringFrequency || "monthly" as "weekly" | "bi-weekly" | "monthly" | "quarterly" | "yearly" | "weekdays"
  });

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Reset form when editingIncome changes
  useEffect(() => {
    if (editingIncome) {
      setFormData({
        type: "income",
        description: editingIncome.description || "",
        amount: editingIncome.amount ? editingIncome.amount.toString() : "",
        paymentDate: editingIncome.paymentDate || undefined,
        category: editingIncome.category || "",
        notes: editingIncome.notes || "",
        isRecurring: editingIncome.isRecurring || isRecurring,
        recurringFrequency: editingIncome.recurringFrequency || "monthly"
      });
    } else {
      setFormData({
        type: "income",
        description: "",
        amount: "",
        paymentDate: undefined,
        category: "",
        notes: "",
        isRecurring: isRecurring,
        recurringFrequency: "monthly"
      });
    }
  }, [editingIncome, isRecurring]);

  const incomeCategories = [
    "Product Sales",
    "Service Revenue", 
    "Subscription",
    "Consulting",
    "License Fees",
    "Investment Returns",
    "Other"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      id: editingIncome?.id || Date.now().toString(),
      ...formData,
      amount: parseFloat(formData.amount),
      paymentDate: formData.paymentDate || new Date(),
      status: editingIncome?.status || 'pending'
    };
    
    console.log("Submitting income:", data);
    
    onSubmitIncome(data);
    
    toast.success(`${isRecurring ? 'Recurring ' : ''}Income ${formData.description ? `"${formData.description}" ` : ''}${editingIncome ? 'updated' : 'added'} successfully!`);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      type: "income",
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingIncome ? 'Edit Income' : (isRecurring ? 'Add Recurring Income' : 'Add Income')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-sm text-muted-foreground mb-4">
          Track your expected income to better manage your cash flow and financial planning.
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="e.g., Monthly subscription revenue"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
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
      </DialogContent>
    </Dialog>
  );
};